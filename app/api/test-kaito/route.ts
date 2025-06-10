import { NextRequest, NextResponse } from 'next/server'

// GET: Kaito APIのテスト
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // シンプルな検索リクエスト
    const testQuery = {
      searchTerms: ["javascript"],
      searchMode: "live",
      minimumFavorites: 10,
      minimumRetweets: 5,
      maxItems: 5,
      includeSearchTerms: false,
    }

    console.log('Testing Kaito API with:', testQuery)

    // API呼び出し
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
    console.log('Kaito API Response:', responseText)

    if (!response.ok) {
      return NextResponse.json({
        error: 'Kaito API error',
        status: response.status,
        statusText: response.statusText,
        response: responseText
      }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const runId = data.data?.id

    if (!runId) {
      return NextResponse.json({
        error: 'No run ID returned',
        response: data
      }, { status: 500 })
    }

    // 少し待ってから結果を確認
    await new Promise(resolve => setTimeout(resolve, 3000))

    const statusResponse = await fetch(
      `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${runId}?token=${process.env.KAITO_API_KEY}`
    )

    const statusData = await statusResponse.json()

    return NextResponse.json({
      success: true,
      runId,
      status: statusData.data.status,
      query: testQuery,
      runDetails: statusData.data
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}