import { NextRequest, NextResponse } from 'next/server'

// GET: Kaito API v2テスト（別のパラメータ形式）
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // 異なるパラメータ形式を試す
    const testQueries = [
      // 形式1: searchQuery
      {
        searchQuery: "javascript",
        maxTweets: 5,
        includeUserInfo: true
      },
      // 形式2: q
      {
        q: "javascript",
        count: 5,
        minLikes: 10
      },
      // 形式3: query
      {
        query: "javascript",
        limit: 5,
        minFavorites: 10
      },
      // 形式4: search
      {
        search: "javascript",
        max: 5,
        minimumLikes: 10
      }
    ]

    const results = []

    for (const [index, query] of testQueries.entries()) {
      console.log(`Testing format ${index + 1}:`, query)

      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs?token=${process.env.KAITO_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(query),
          }
        )

        const responseText = await response.text()
        
        results.push({
          format: index + 1,
          query,
          status: response.status,
          ok: response.ok,
          response: responseText.substring(0, 200) // 最初の200文字だけ
        })
      } catch (error) {
        results.push({
          format: index + 1,
          query,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      tested: results.length,
      results
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}