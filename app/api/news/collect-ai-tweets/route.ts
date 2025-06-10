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

    // Kaito APIを使用してAI関連のツイートを収集 - 新しいアクターを使用
    const kaitoUrl = `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs?token=${process.env.KAITO_API_KEY}`
    
    // AI関連の検索クエリ（新しいフォーマット）
    const searchQuery = '(AI OR ChatGPT OR GPT-4 OR "Claude AI" OR Anthropic OR OpenAI OR "Google AI" OR "Gemini AI" OR "Microsoft AI" OR "AI research" OR "artificial intelligence" OR LLM OR "large language model") min_faves:100 min_retweets:20 -is:retweet lang:ja'

    console.log('Searching for AI tweets with query:', searchQuery)

    const response = await fetch(kaitoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterContent: searchQuery,
        maxItems: 30,
        lang: 'ja',
        'filter:replies': false,
        'filter:blue_verified': false,
        'filter:nativeretweets': false,
        queryType: 'Latest'
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
        const statusMessage = runData.data.statusMessage || 'Unknown error'
        
        if (statusMessage.includes('Twitter put all content behind login')) {
          throw new Error('Twitter APIの制限により、現在この収集方法は利用できません。')
        }
        
        throw new Error(`Kaito API run failed: ${statusMessage}`)
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
        const username = tweet.author?.userName || tweet.author?.username || 'unknown'
        const tweetId = tweet.id
        const text = tweet.text || ''
        
        if (!tweetId || !text) {
          console.log('Skipping tweet with missing ID or text:', tweet)
          skippedCount++
          continue
        }

        const url = tweet.url || tweet.twitterUrl || `https://twitter.com/${username}/status/${tweetId}`
        
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
              publishedAt: new Date(tweet.createdAt || Date.now()),
              category: 'Twitter',
              metadata: {
                author: username,
                likes: tweet.likeCount || 0,
                retweets: tweet.retweetCount || 0,
                views: tweet.viewCount || 0,
                authorId: tweet.author?.id
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