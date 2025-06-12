import { NextRequest, NextResponse } from 'next/server'

// GET: tweet-flashアクターのテスト
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // tweet-flashアクターを試す
    const testQuery = {
      url: "https://twitter.com/search?q=javascript&src=typed_query&f=live",
      maxItems: 5
    }

    console.log('Testing tweet-flash with:', testQuery)

    const response = await fetch(
      `https://api.apify.com/v2/acts/shanes~tweet-flash/runs?token=${process.env.KAITO_API_KEY}`,
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
      // アクターが見つからない場合は、easy-twitter-search-scraperを試す
      console.log('Trying easy-twitter-search-scraper...')
      
      const easyTwitterQuery = {
        queries: ["javascript"],
        maxTweets: 5,
        onlyVerified: false
      }

      const easyResponse = await fetch(
        `https://api.apify.com/v2/acts/web.harvester~easy-twitter-search-scraper/runs?token=${process.env.KAITO_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(easyTwitterQuery),
        }
      )

      const easyResponseText = await easyResponse.text()
      
      return NextResponse.json({
        tweetFlashError: responseText,
        easyTwitterResponse: easyResponseText,
        easyTwitterStatus: easyResponse.status
      })
    }

    const data = JSON.parse(responseText)
    return NextResponse.json({
      success: true,
      actor: 'tweet-flash',
      runId: data.data?.id,
      response: data
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}