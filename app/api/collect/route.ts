import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Kaito API (Apify) の設定
const KAITO_API_URL = 'https://api.apify.com/v2/acts/quacker~twitter-scraper/runs'

// POST: Kaito APIを使ってバズ投稿を収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, minLikes = 1000, minRetweets = 100, maxItems = 20 } = body

    // Kaito API呼び出し
    const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchTerms: [query],
        searchMode: 'live',
        minimumFavorites: minLikes,
        minimumRetweets: minRetweets,
        maxItems,
        includeSearchTerms: false,
      }),
    })

    if (!response.ok) {
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
      
      if (runData.data.status === 'SUCCEEDED') {
        const datasetId = runData.data.defaultDatasetId
        const itemsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
        )
        results = await itemsResponse.json()
        break
      } else if (runData.data.status === 'FAILED') {
        throw new Error('Kaito API run failed')
      }
      
      retries++
    }

    if (!results) {
      throw new Error('Kaito API timeout')
    }

    // 取得したデータをデータベースに保存
    const savedPosts = []
    for (const tweet of results) {
      try {
        const existingPost = await prisma.buzzPost.findUnique({
          where: { postId: tweet.id },
        })

        if (!existingPost) {
          const post = await prisma.buzzPost.create({
            data: {
              postId: tweet.id,
              content: tweet.text || tweet.full_text || '',
              authorUsername: tweet.author?.username || '',
              authorId: tweet.author?.id || '',
              likesCount: tweet.favorite_count || 0,
              retweetsCount: tweet.retweet_count || 0,
              repliesCount: tweet.reply_count || 0,
              impressionsCount: tweet.impressions_count || 0,
              postedAt: new Date(tweet.created_at),
              url: tweet.url || `https://twitter.com/${tweet.author?.username}/status/${tweet.id}`,
              theme: query,
              language: tweet.lang || 'ja',
              mediaUrls: tweet.media?.map((m: any) => m.media_url_https) || [],
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