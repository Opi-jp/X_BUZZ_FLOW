import { NextRequest, NextResponse } from 'next/server'

// GET: 認証情報を使ったテスト
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // 様々な形式を試す
    const testQueries = [
      {
        name: "Basic search with auth",
        params: {
          searchTerms: ["AI"],
          searchMode: "live",
          maxItems: 3,
          includeSearchTerms: false,
          // 認証情報（もし必要なら）
          twitterLogin: process.env.TWITTER_USERNAME || "",
          twitterPassword: process.env.TWITTER_PASSWORD || "",
        }
      },
      {
        name: "Simple search",
        params: {
          startUrls: ["https://twitter.com/search?q=AI&src=typed_query&f=live"],
          maxItems: 3
        }
      },
      {
        name: "Direct URL",
        params: {
          directUrls: ["https://twitter.com/search?q=AI"],
          maxItems: 3
        }
      }
    ]

    const results = []

    for (const testQuery of testQueries) {
      console.log(`Testing ${testQuery.name}:`, testQuery.params)

      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs?token=${process.env.KAITO_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testQuery.params),
          }
        )

        const data = await response.json()
        
        if (response.ok && data.data?.id) {
          // 3秒待つ
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          const statusResponse = await fetch(
            `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${data.data.id}?token=${process.env.KAITO_API_KEY}`
          )
          
          const statusData = await statusResponse.json()
          
          results.push({
            name: testQuery.name,
            runId: data.data.id,
            status: statusData.data.status,
            statusMessage: statusData.data.statusMessage?.substring(0, 100)
          })
        } else {
          results.push({
            name: testQuery.name,
            error: 'Failed to start run',
            response: data
          })
        }
      } catch (error) {
        results.push({
          name: testQuery.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}