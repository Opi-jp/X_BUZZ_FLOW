import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: Twitterアカウントからニュースを収集
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
    const body = await request.json()
    const { sourceId } = body

    // Twitterソースを取得
    const twitterSources = await prisma.newsSource.findMany({
      where: { 
        type: 'TWITTER',
        active: true,
        ...(sourceId && { id: sourceId })
      }
    })

    if (twitterSources.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'アクティブなTwitterソースが見つかりません'
      })
    }

    let totalCollected = 0
    let totalSaved = 0

    // 各Twitterアカウントから収集
    for (const source of twitterSources) {
      try {
        // TwitterユーザーIDを抽出
        const username = source.url.split('/').pop() || ''
        
        // Kaito APIを使用してツイートを収集 - 新しいアクターを使用
        const kaitoUrl = `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs?token=${process.env.KAITO_API_KEY}`
        
        const response = await fetch(kaitoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            twitterContent: `from:${username} (AI OR ChatGPT OR GPT OR LLM OR "artificial intelligence" OR "machine learning" OR "deep learning" OR Anthropic OR Claude OR OpenAI) -is:retweet`,
            maxItems: 20,
            lang: 'en',
            'filter:replies': false,
            'filter:nativeretweets': false,
            queryType: 'Latest'
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Kaito API error for ${username}:`, response.status, errorText)
          
          if (response.status === 401 || response.status === 403) {
            return NextResponse.json(
              { 
                error: 'Kaito API authentication failed',
                details: 'APIキーが無効です'
              },
              { status: 401 }
            )
          }
          continue
        }

        const data = await response.json()
        const runId = data.data.id

        // 実行結果を取得（ポーリング）
        let tweets = null
        let retries = 0
        const maxRetries = 15 // 15秒に短縮

        while (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const resultResponse = await fetch(
            `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${runId}?token=${process.env.KAITO_API_KEY}`
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
            console.error(`Kaito API run failed for ${username}`)
            break
          }
          
          retries++
        }

        if (!tweets) continue

        // Kaito APIの検索クエリで既にAI関連ツイートをフィルタリングしているので、そのまま使用
        totalCollected += tweets.length

        // ニュース記事として保存
        for (const tweet of tweets) {
          try {
            const url = `https://twitter.com/${username}/status/${tweet.id}`
            
            // URLが既に存在するかチェック
            const existing = await prisma.newsArticle.findUnique({
              where: { url }
            })

            if (!existing && tweet.text) {
              await prisma.newsArticle.create({
                data: {
                  sourceId: source.id,
                  title: `@${username}: ${(tweet.text || tweet.full_text || '').substring(0, 100)}...`,
                  summary: tweet.text || tweet.full_text || '',
                  content: tweet.text || tweet.full_text || '',
                  url,
                  publishedAt: new Date(tweet.created_at || tweet.createdAt || Date.now()),
                  category: 'Twitter',
                }
              })
              totalSaved++
            }
          } catch (error) {
            console.error('Error saving tweet as article:', error)
          }
        }
      } catch (error) {
        console.error(`Error collecting from ${source.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      totalCollected,
      saved: totalSaved,
      message: `${totalSaved}件の新しいツイートを保存しました`
    })
  } catch (error) {
    console.error('Error collecting Twitter news:', error)
    return NextResponse.json(
      { 
        error: 'Failed to collect Twitter news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}