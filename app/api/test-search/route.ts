import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs'
  
  // シンプルなテストクエリ
  const testQueries = [
    'ChatGPT 効率化 min_faves:1000 -is:retweet lang:ja',
    'Claude 使い方 min_faves:500 -is:retweet lang:ja',
    'プロンプト ChatGPT min_faves:800 -is:retweet lang:ja',
  ]
  
  const results = []
  
  for (const query of testQueries) {
    try {
      console.log(`Testing query: ${query}`)
      
      const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterContent: query,
          maxItems: 3,
          lang: 'ja',
          'filter:replies': false,
          'filter:nativeretweets': false,
          queryType: 'Latest'
        }),
      })
      
      if (!response.ok) {
        results.push({
          query,
          error: `API Error: ${response.statusText}`,
          status: response.status
        })
        continue
      }
      
      const data = await response.json()
      const runId = data.data.id
      
      // 結果を待つ
      let tweets = null
      let retries = 0
      
      while (retries < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const resultResponse = await fetch(
          `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs/${runId}?token=${process.env.KAITO_API_KEY}`
        )
        
        const runData = await resultResponse.json()
        
        if (runData.data.status === 'SUCCEEDED') {
          const datasetId = runData.data.defaultDatasetId
          const itemsResponse = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
          )
          tweets = await itemsResponse.json()
          break
        } else if (runData.data.status === 'FAILED') {
          results.push({
            query,
            error: runData.data.statusMessage || 'Run failed'
          })
          break
        }
        
        retries++
      }
      
      if (tweets) {
        results.push({
          query,
          count: tweets.length,
          tweets: tweets.slice(0, 3).map((tweet: any) => ({
            author: tweet.author?.userName,
            text: tweet.text?.substring(0, 200),
            likes: tweet.likeCount || 0,
            retweets: tweet.retweetCount || 0,
            views: tweet.viewCount || 0,
          }))
        })
      }
      
    } catch (error) {
      results.push({
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return NextResponse.json({ results })
}