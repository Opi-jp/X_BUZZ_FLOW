import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getKaitoSinceParam } from '@/lib/date-utils'

// Kaito API (Apify) の設定 - 新しいTwitterスクレイパーを使用
const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs'

// POST: Kaito APIを使ってバズ投稿を収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, minLikes = 1000, minRetweets = 100, minEngagementRate = 0, maxItems = 20, date, excludeReplies = true } = body

    // 日付フィルター（指定された場合）
    const dateFilter = date ? {
      since: getKaitoSinceParam(date)
    } : {}

    // クエリが「from:」で始まる場合はユーザータイムライン取得
    const isUserTimeline = query.startsWith('from:')
    const requestBody = isUserTimeline ? {
      twitterContent: query,
      maxItems,
      lang: 'ja',
      'filter:replies': false,
      'filter:nativeretweets': false,
      queryType: 'Latest',
      ...dateFilter
    } : {
      twitterContent: `${query} min_faves:${minLikes} min_retweets:${minRetweets} -is:retweet lang:ja`,
      maxItems,
      lang: 'ja',
      'filter:replies': false,
      'filter:blue_verified': false,
      'filter:nativeretweets': false,
      queryType: 'Latest',
      ...dateFilter
    }

    console.log('Kaito API Request:', requestBody)
    
    // Kaito API呼び出し
    const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Kaito API Error Response:', errorText)
      throw new Error(`Kaito API error: ${response.statusText}`)
    }

    const data = await response.json()
    const runId = data.data.id

    // 実行結果を取得（ポーリング）
    let results = null
    let retries = 0
    const maxRetries = 30 // 最大30秒待機

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
      
      const resultResponse = await fetch(
        `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${runId}?token=${process.env.KAITO_API_KEY}`
      )
      
      const runData = await resultResponse.json()
      console.log(`Run status: ${runData.data.status}`)
      
      if (runData.data.status === 'SUCCEEDED') {
        const datasetId = runData.data.defaultDatasetId
        const itemsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
        )
        results = await itemsResponse.json()
        console.log(`Found ${results.length} items`)
        break
      } else if (runData.data.status === 'FAILED') {
        console.error('Kaito API run failed. Run details:', runData.data)
        const statusMessage = runData.data.statusMessage || 'Unknown error'
        
        // Twitterのログイン制限エラーをチェック
        if (statusMessage.includes('Twitter put all content behind login')) {
          throw new Error('Twitter APIの制限: 2023年6月30日以降、Twitterはログインを必要とするようになりました。現在、この収集方法は利用できません。')
        }
        
        throw new Error(`Kaito API run failed: ${statusMessage}`)
      }
      
      retries++
    }

    if (!results) {
      throw new Error('Kaito API timeout')
    }

    // 取得したデータをデータベースに保存（新しいフォーマットに対応）
    const savedPosts = []
    let skippedCount = 0
    
    for (const tweet of results) {
      try {
        // リプライを除外（excludeRepliesがtrueの場合）
        if (excludeReplies && tweet.text && tweet.text.trim().startsWith('@')) {
          skippedCount++
          continue
        }
        
        // エンゲージメント率の計算
        const impressions = tweet.viewCount || tweet.impressions_count || 0
        const likes = tweet.likeCount || tweet.favorite_count || 0
        const retweets = tweet.retweetCount || tweet.retweet_count || 0
        const replies = tweet.replyCount || tweet.reply_count || 0
        
        if (impressions > 0 && minEngagementRate > 0) {
          const engagementRate = ((likes + retweets + replies) / impressions) * 100
          if (engagementRate < minEngagementRate) {
            skippedCount++
            continue
          }
        }
        
        const existingPost = await prisma.buzzPost.findUnique({
          where: { postId: tweet.id },
        })

        if (!existingPost) {
          const post = await prisma.buzzPost.create({
            data: {
              postId: tweet.id,
              content: tweet.text || '',
              authorUsername: tweet.author?.userName || tweet.author?.username || '',
              authorId: tweet.author?.id || '',
              likesCount: likes,
              retweetsCount: retweets,
              repliesCount: replies,
              impressionsCount: impressions,
              postedAt: new Date(tweet.createdAt || tweet.created_at),
              url: tweet.url || tweet.twitterUrl || `https://twitter.com/${tweet.author?.userName}/status/${tweet.id}`,
              theme: query,
              language: tweet.lang || 'ja',
              mediaUrls: tweet.extendedEntities?.media?.map((m: any) => m.media_url_https) || [],
              hashtags: tweet.entities?.hashtags?.map((h: any) => h.text) || [],
            },
          })
          savedPosts.push(post)
        }
      } catch (error) {
        console.error('Error saving tweet:', error)
      }
    }

    return NextResponse.json({
      collected: results.length,
      saved: savedPosts.length,
      skipped: skippedCount,
      posts: savedPosts,
    })
  } catch (error) {
    console.error('Error collecting posts:', error)
    return NextResponse.json(
      { error: 'Failed to collect posts' },
      { status: 500 }
    )
  }
}