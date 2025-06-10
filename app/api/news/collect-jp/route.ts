import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: 日本のAIニュース収集（代替アプローチ）
export async function POST(request: NextRequest) {
  try {
    // ITmediaやGigazineなどの日本のテックニュースRSSフィードを収集
    const feeds = [
      {
        name: 'ITmedia AI+',
        url: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',
        category: 'JP Tech'
      },
      {
        name: 'GIGAZINE',
        url: 'https://gigazine.net/news/rss_2.0',
        category: 'JP Tech'
      }
    ]

    let totalSaved = 0
    let totalSkipped = 0

    for (const feed of feeds) {
      try {
        // ソースを取得または作成
        let source = await prisma.newsSource.findFirst({
          where: { url: feed.url }
        })

        if (!source) {
          source = await prisma.newsSource.create({
            data: {
              name: feed.name,
              url: feed.url,
              type: 'RSS',
              category: feed.category,
            }
          })
        }

        // RSSフィードを取得
        const response = await fetch(feed.url)
        if (!response.ok) continue

        const text = await response.text()
        
        // 簡易的なRSSパース（実際のプロダクションではrss-parserなどを使用）
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
        
        for (const item of items.slice(0, 10)) { // 最新10件のみ
          try {
            const title = item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || ''
            const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
            const description = item.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || ''
            const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

            // AI関連の記事のみフィルタリング
            const aiKeywords = ['AI', '人工知能', 'ChatGPT', 'Claude', 'OpenAI', 'LLM', '機械学習', 'ディープラーニング']
            const isAiRelated = aiKeywords.some(keyword => 
              title.includes(keyword) || description.includes(keyword)
            )

            if (!isAiRelated) continue

            // URLが既に存在するかチェック
            const existing = await prisma.newsArticle.findUnique({
              where: { url: link }
            })

            if (!existing && title && link) {
              await prisma.newsArticle.create({
                data: {
                  sourceId: source.id,
                  title: title,
                  summary: description.substring(0, 500),
                  content: description,
                  url: link,
                  publishedAt: pubDate ? new Date(pubDate) : new Date(),
                  category: 'AI',
                }
              })
              totalSaved++
            } else {
              totalSkipped++
            }
          } catch (error) {
            console.error('Error parsing RSS item:', error)
            totalSkipped++
          }
        }
      } catch (error) {
        console.error('Error processing feed:', feed.name, error)
      }
    }

    return NextResponse.json({
      success: true,
      saved: totalSaved,
      skipped: totalSkipped,
      message: `${totalSaved}件の新しい記事を保存しました`
    })
  } catch (error) {
    console.error('Error collecting JP news:', error)
    return NextResponse.json(
      { error: 'Failed to collect JP news' },
      { status: 500 }
    )
  }
}