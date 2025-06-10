import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: AI関連の一般的なツイートを収集
export async function POST(request: NextRequest) {
  try {
    // Kaito APIキーの確認
    if (!process.env.KAITO_API_KEY) {
      console.error('KAITO_API_KEY is not set')
      return NextResponse.json(
        { 
          error: 'Kaito API key is not configured',
          details: 'KAITO_API_KEY環境変数が設定されていません'
        },
        { status: 500 }
      )
    }

    // AI Tweetsソースを作成（なければ）
    let aiTweetsSource = await prisma.newsSource.findFirst({
      where: { type: 'TWITTER', name: 'AI Community Tweets' }
    })

    if (!aiTweetsSource) {
      aiTweetsSource = await prisma.newsSource.create({
        data: {
          name: 'AI Community Tweets',
          url: 'https://twitter.com/search',
          type: 'TWITTER',
          category: 'AI',
          active: true,
        }
      })
    }

    // Kaito APIを使用してAI関連のツイートを収集
    const kaitoUrl = `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs?token=${process.env.KAITO_API_KEY}`
    
    // AI関連の検索クエリ
    const searchQuery = `(ChatGPT OR GPT-4 OR GPT4 OR "Claude AI" OR Claude3 OR Anthropic OR OpenAI OR "Gemini AI" OR "Google AI" OR "Microsoft AI" OR LLM OR "large language model" OR "artificial intelligence" OR "machine learning" OR "deep learning" OR "AI research" OR "AI breakthrough" OR "AI announcement") min_faves:100 min_retweets:20 -filter:retweets -filter:replies lang:en`

    console.log('Searching for AI tweets with query:', searchQuery)

    const response = await fetch(kaitoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterContent: searchQuery,
        maxItems: 30,
        'include:nativeretweets': false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Kaito API error:', response.status, errorText)
      throw new Error(`Kaito API error: ${response.status}`)
    }

    const data = await response.json()
    const runId = data.data.id

    // 実行結果を取得（ポーリング）
    let tweets = null
    let retries = 0
    const maxRetries = 15 // 30秒に短縮

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const resultResponse = await fetch(
        `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${runId}?token=${process.env.KAITO_API_KEY}`
      )
      
      const runData = await resultResponse.json()
      console.log(`Run status: ${runData.data.status} (attempt ${retries + 1}/${maxRetries})`)
      
      if (runData.data.status === 'SUCCEEDED') {
        const datasetId = runData.data.defaultDatasetId
        const itemsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
        )
        tweets = await itemsResponse.json()
        break
      } else if (runData.data.status === 'FAILED') {
        console.error('Kaito API run failed')
        throw new Error('Kaito API run failed')
      }
      
      retries++
    }

    if (!tweets) {
      return NextResponse.json({
        success: false,
        message: 'タイムアウト: ツイートの取得に失敗しました'
      })
    }

    console.log(`Found ${tweets.length} AI-related tweets`)

    // ニュース記事として保存
    let savedCount = 0
    let skippedCount = 0

    for (const tweet of tweets) {
      try {
        const username = tweet.author?.username || tweet.user?.screen_name || 'unknown'
        const tweetId = tweet.id || tweet.id_str
        const text = tweet.text || tweet.full_text || ''
        
        if (!tweetId || !text) {
          skippedCount++
          continue
        }

        const url = `https://twitter.com/${username}/status/${tweetId}`
        
        // URLが既に存在するかチェック
        const existing = await prisma.newsArticle.findUnique({
          where: { url }
        })

        if (!existing) {
          await prisma.newsArticle.create({
            data: {
              sourceId: aiTweetsSource.id,
              title: `@${username}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
              summary: text,
              content: text,
              url,
              publishedAt: new Date(tweet.created_at || tweet.createdAt || Date.now()),
              category: 'Twitter',
              metadata: {
                author: username,
                likes: tweet.favorite_count || tweet.likeCount || 0,
                retweets: tweet.retweet_count || tweet.retweetCount || 0,
              }
            }
          })
          savedCount++
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error('Error saving tweet:', error)
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      totalFound: tweets.length,
      saved: savedCount,
      skipped: skippedCount,
      message: `${savedCount}件の新しいAI関連ツイートを保存しました`
    })
  } catch (error) {
    console.error('Error collecting AI tweets:', error)
    return NextResponse.json(
      { error: 'Failed to collect AI tweets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}