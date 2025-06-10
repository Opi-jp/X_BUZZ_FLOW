import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: Twitterアカウントからニュースを収集
export async function POST(request: NextRequest) {
  try {
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
        
        // Kaito APIを使用してツイートを収集
        const kaitoUrl = `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs?token=${process.env.KAITO_API_KEY}`
        
        const response = await fetch(kaitoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            author: username,
            searchMode: 'user',
            maxItems: 10, // 最新10件
            includeSearchTerms: false,
          }),
        })

        if (!response.ok) {
          console.error(`Kaito API error for ${username}:`, response.statusText)
          continue
        }

        const data = await response.json()
        const runId = data.data.id

        // 実行結果を取得（ポーリング）
        let tweets = null
        let retries = 0
        const maxRetries = 20

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

        // AI関連のツイートをフィルタリング（キーワード含む）
        const aiKeywords = ['AI', 'ChatGPT', 'GPT', 'LLM', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'model', 'Anthropic', 'Claude', 'OpenAI']
        const aiTweets = tweets.filter((tweet: any) => {
          const text = tweet.text || tweet.full_text || ''
          return aiKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
          )
        })

        totalCollected += aiTweets.length

        // ニュース記事として保存
        for (const tweet of aiTweets) {
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
                  title: `@${username}: ${tweet.text.substring(0, 100)}...`,
                  summary: tweet.text,
                  content: tweet.text,
                  url,
                  publishedAt: new Date(tweet.created_at),
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
      { error: 'Failed to collect Twitter news' },
      { status: 500 }
    )
  }
}