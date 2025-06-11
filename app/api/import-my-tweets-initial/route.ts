import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// 初期データインポート用（認証済みユーザーの過去ツイートを大量に取得）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.username) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const limit = body.limit || 500 // デフォルト500件
    
    console.log(`Importing tweets for @${session.user.username}, limit: ${limit}`)

    // Kaito API で自分のツイートを取得
    const kaitoApiKey = process.env.KAITO_API_KEY
    if (!kaitoApiKey) {
      return NextResponse.json(
        { error: 'Kaito API key not configured' },
        { status: 500 }
      )
    }

    const kaitoResponse = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-user-timeline/run-sync-get-dataset-items?token=${kaitoApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: session.user.username,
          maxTweets: limit,
          sort: 'Latest',
          twitterContent: ['posts']
        })
      }
    )

    if (!kaitoResponse.ok) {
      console.error('Kaito API error:', kaitoResponse.status)
      return NextResponse.json(
        { error: 'ツイートの取得に失敗しました' },
        { status: 500 }
      )
    }

    const tweets = await kaitoResponse.json()
    console.log(`Fetched ${tweets.length} tweets from Kaito API`)

    // 保存処理
    let saved = 0
    let skipped = 0
    let errors = 0

    for (const tweet of tweets) {
      try {
        // RTやリプライはスキップ
        if (tweet.isRetweet || tweet.isReply || tweet.isQuote) {
          skipped++
          continue
        }

        // 既存チェック
        const existing = await prisma.buzzPost.findFirst({
          where: { url: tweet.url }
        })
        
        if (existing) {
          skipped++
          continue
        }

        // エンゲージメント率を計算
        const impressions = tweet.viewCount || 0
        const engagements = (tweet.likeCount || 0) + (tweet.retweetCount || 0) + (tweet.replyCount || 0)
        const engagementRate = impressions > 0 ? (engagements / impressions * 100) : 0

        // 保存
        await prisma.buzzPost.create({
          data: {
            content: tweet.fullText || tweet.text || '',
            authorUsername: session.user.username,
            authorName: tweet.author?.name || session.user.username,
            likesCount: tweet.likeCount || 0,
            retweetsCount: tweet.retweetCount || 0,
            impressionsCount: impressions,
            url: tweet.url || '',
            postedAt: tweet.createdAt ? new Date(tweet.createdAt) : new Date(),
            theme: '自分の投稿分析',
            hashtags: tweet.hashtags || [],
            isAnalyzed: true,
            metadata: {
              engagementRate,
              quoteTweetCount: tweet.quoteTweetCount || 0,
              replyCount: tweet.replyCount || 0,
              importedAt: new Date().toISOString(),
              source: 'initial_import'
            }
          }
        })
        
        saved++
        
      } catch (error) {
        console.error('Error saving tweet:', error)
        errors++
      }
    }

    // 統計情報を計算
    const myPosts = await prisma.buzzPost.findMany({
      where: { 
        authorUsername: session.user.username,
        theme: '自分の投稿分析'
      },
      orderBy: { likesCount: 'desc' },
      take: 10
    })

    const stats = {
      totalImported: saved,
      totalSkipped: skipped,
      totalErrors: errors,
      topPosts: myPosts.map(p => ({
        content: p.content.substring(0, 100),
        likes: p.likesCount,
        retweets: p.retweetsCount,
        impressions: p.impressionsCount,
        url: p.url
      }))
    }

    return NextResponse.json({
      message: `${saved}件のツイートをインポートしました`,
      stats
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'インポート中にエラーが発生しました' },
      { status: 500 }
    )
  }
}