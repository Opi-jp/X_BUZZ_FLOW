import { NextResponse } from 'next/server'

// Kaito API収集のテスト
export async function GET() {
  try {
    console.log('Testing Kaito API collection...')
    
    // シンプルなテストクエリ
    const testQuery = 'AI lang:ja min_faves:100'
    
    const requestBody = {
      twitterContent: testQuery,
      maxItems: 5,
      lang: 'ja',
      'filter:replies': false,
      'filter:nativeretweets': false,
      queryType: 'Latest'
    }
    
    console.log('Request body:', requestBody)
    
    // Kaito API呼び出し
    const response = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs?token=${process.env.KAITO_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )
    
    const responseText = await response.text()
    console.log('Response status:', response.status)
    console.log('Response:', responseText)
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Kaito API error',
        status: response.status,
        response: responseText
      }, { status: 500 })
    }
    
    const data = JSON.parse(responseText)
    const runId = data.data?.id
    
    if (!runId) {
      return NextResponse.json({
        error: 'No run ID returned',
        data
      }, { status: 500 })
    }
    
    // 結果を待つ（最大10秒）
    let results = null
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const resultResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${process.env.KAITO_API_KEY}`
      )
      
      if (resultResponse.ok) {
        results = await resultResponse.json()
        if (results && results.length > 0) {
          break
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      runId,
      results: results || [],
      resultCount: results?.length || 0
    })
    
  } catch (error) {
    console.error('Test collect error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}