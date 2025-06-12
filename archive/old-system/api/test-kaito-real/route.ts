import { NextRequest, NextResponse } from 'next/server'

// GET: 実際のTwitter Scraper形式でテスト
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // Apify Twitter Scraperの実際のパラメータ形式
    const testQuery = {
      // ユーザーが以前言及した形式に基づく
      queries: ["javascript"],
      filter: {
        blue_verified: false,
        verified: false,
        has_verified_badge: false
      },
      wait_for_selector: ".css-1dbjc4n",
      max_items: 5,
      language: "ja",
      author_filter: "",
      max_tweets: 5,
      min_replies: 0,
      min_retweets: 5,
      min_likes: 10,
      only_verified: false,
      only_blue_verified: false
    }

    console.log('Testing with query:', testQuery)

    const response = await fetch(
      `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs?token=${process.env.KAITO_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testQuery),
      }
    )

    const responseText = await response.text()
    console.log('Response:', responseText)

    if (!response.ok) {
      return NextResponse.json({
        error: 'API request failed',
        status: response.status,
        response: responseText
      }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const runId = data.data?.id

    // 5秒待って結果を確認
    await new Promise(resolve => setTimeout(resolve, 5000))

    const statusResponse = await fetch(
      `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${runId}?token=${process.env.KAITO_API_KEY}`
    )

    const statusData = await statusResponse.json()

    // もし成功していたら結果を取得
    let results = null
    if (statusData.data.status === 'SUCCEEDED') {
      const datasetId = statusData.data.defaultDatasetId
      const itemsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
      )
      results = await itemsResponse.json()
    }

    return NextResponse.json({
      success: true,
      runId,
      status: statusData.data.status,
      query: testQuery,
      results: results ? `Found ${results.length} items` : 'No results yet',
      firstItem: results?.[0] || null
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}