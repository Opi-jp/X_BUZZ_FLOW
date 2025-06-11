import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CollectionResult {
  presetName: string
  collected: number
  duplicates: number
  errors: string[]
}

export async function POST(request: Request) {
  try {
    // 1. まずニュース収集を実行
    const baseUrl = process.env.NEXTAUTH_URL || 'https://x-buzz-flow.vercel.app'
    let newsResult = null
    try {
      const newsResponse = await fetch(`${baseUrl}/api/news/collect-rss-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sinceDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
      })
      
      if (newsResponse.ok) {
        newsResult = await newsResponse.json()
        console.log('News collection completed:', newsResult)
      }
    } catch (error) {
      console.error('News collection error:', error)
    }

    // 2. バズ投稿収集
    // 全てのアクティブなプリセットを取得
    const presets = await prisma.collectionPreset.findMany({
      where: { isActive: true }
    })

    if (presets.length === 0) {
      return NextResponse.json({ error: 'アクティブなプリセットがありません' }, { status: 400 })
    }

    const results: CollectionResult[] = []
    
    // 各プリセットで並列収集
    const collectionPromises = presets.map(async (preset) => {
      try {
        // Kaito API（Apify）を使用して収集 - 新しいエンドポイントを使用
        const baseUrl = process.env.NEXTAUTH_URL || 'https://x-buzz-flow.vercel.app'
        const collectResponse = await fetch(`${baseUrl}/api/collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: preset.query,
            minLikes: preset.minLikes || 100,
            minRetweets: preset.minRetweets || 10,
            maxItems: 20,
            excludeReplies: true
          }),
        })

        if (!collectResponse.ok) {
          throw new Error(`API error: ${collectResponse.status}`)
        }

        const data = await collectResponse.json()
        const tweets = data.posts || []
        
        let collected = 0
        let duplicates = 0

        // 収集したツイートを保存
        for (const tweet of tweets) {
          // 重複チェック
          const existing = await prisma.buzzPost.findUnique({
            where: { postId: tweet.id }
          })

          if (existing) {
            duplicates++
            continue
          }

          // 新規保存
          await prisma.buzzPost.create({
            data: {
              postId: tweet.id,
              content: tweet.fullText || tweet.text || '',
              authorUsername: tweet.author?.username || 'unknown',
              authorId: tweet.author?.id || '',
              authorFollowers: tweet.author?.followers,
              authorFollowing: tweet.author?.following,
              authorVerified: tweet.author?.isVerified,
              likesCount: tweet.likeCount || 0,
              retweetsCount: tweet.retweetCount || 0,
              repliesCount: tweet.replyCount || 0,
              impressionsCount: tweet.viewCount || 0,
              postedAt: new Date(tweet.createdAt),
              theme: preset.category || preset.name,
              url: tweet.url || `https://twitter.com/${tweet.author?.username}/status/${tweet.id}`,
              language: preset.language || 'ja',
              mediaUrls: tweet.media?.map((m: any) => m.url) || [],
              hashtags: tweet.hashtags || []
            },
          })
          collected++
        }

        return {
          presetName: preset.name,
          collected,
          duplicates,
          errors: []
        }
      } catch (error) {
        console.error(`Error collecting for preset ${preset.name}:`, error)
        return {
          presetName: preset.name,
          collected: 0,
          duplicates: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }
    })

    // 全ての収集を待つ
    const collectionResults = await Promise.all(collectionPromises)

    // 統計情報を計算
    const totalCollected = collectionResults.reduce((sum, r) => sum + r.collected, 0)
    const totalDuplicates = collectionResults.reduce((sum, r) => sum + r.duplicates, 0)
    const successfulPresets = collectionResults.filter(r => r.errors.length === 0).length

    // 自動分析（高スコア投稿の抽出）
    const recentHighScorePosts = await prisma.buzzPost.findMany({
      where: {
        collectedAt: {
          gte: new Date(Date.now() - 3 * 60 * 60 * 1000) // 過去3時間
        },
        OR: [
          { likesCount: { gte: 5000 } },
          { retweetsCount: { gte: 1000 } },
          { 
            AND: [
              { authorFollowers: { gte: 100000 } },
              { likesCount: { gte: 1000 } }
            ]
          }
        ]
      },
      orderBy: { likesCount: 'desc' },
      take: 20
    })

    // RP候補の自動抽出
    const rpCandidates = recentHighScorePosts.filter(post => {
      const engagementRate = post.impressionsCount > 0 
        ? ((post.likesCount + post.retweetsCount) / post.impressionsCount) * 100 
        : 0
      
      return (
        engagementRate > 5 && // エンゲージメント率5%以上
        post.authorFollowers && post.authorFollowers > 50000 && // フォロワー5万人以上
        new Date(post.postedAt).getTime() > Date.now() - 6 * 60 * 60 * 1000 // 6時間以内
      )
    }).slice(0, 5) // TOP 5

    return NextResponse.json({
      success: true,
      summary: {
        totalCollected,
        totalDuplicates,
        successfulPresets,
        totalPresets: presets.length,
        collectionTime: new Date().toISOString(),
        newsCollected: newsResult?.totalCollected || 0
      },
      details: collectionResults,
      newsCollection: newsResult,
      analysis: {
        highScorePosts: recentHighScorePosts.length,
        rpCandidates: rpCandidates.map(post => ({
          id: post.id,
          author: post.authorUsername,
          followers: post.authorFollowers,
          content: post.content.substring(0, 100) + '...',
          engagementRate: post.impressionsCount > 0 
            ? ((post.likesCount + post.retweetsCount) / post.impressionsCount * 100).toFixed(2) + '%'
            : 'N/A',
          url: post.url
        }))
      }
    })

  } catch (error) {
    console.error('Batch collection error:', error)
    return NextResponse.json(
      { error: 'バッチ収集中にエラーが発生しました' },
      { status: 500 }
    )
  }
}