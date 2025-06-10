import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: 収集ジョブを開始（非同期）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type = 'all' } = body

    // ジョブを作成
    const job = await prisma.jobQueue.create({
      data: {
        type: `collect_${type}`,
        status: 'pending',
        payload: body,
      }
    })

    // バックグラウンドで収集を開始（即座にレスポンスを返す）
    startCollection(job.id, type).catch(error => {
      console.error('Collection error:', error)
      prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          endedAt: new Date()
        }
      })
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: '収集を開始しました',
      statusUrl: `/api/news/jobs/${job.id}`
    })
  } catch (error) {
    console.error('Error starting collection:', error)
    return NextResponse.json(
      { error: 'Failed to start collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// バックグラウンドで収集を実行
async function startCollection(jobId: string, type: string) {
  // ジョブを開始
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date()
    }
  })

  let totalSaved = 0
  let totalSkipped = 0
  const results: any[] = []

  try {
    if (type === 'rss' || type === 'all') {
      const rssResult = await collectRSS(jobId)
      totalSaved += rssResult.saved
      totalSkipped += rssResult.skipped
      results.push({ type: 'rss', ...rssResult })
    }

    if (type === 'twitter' || type === 'all') {
      // Twitter収集を実装（今は省略）
      results.push({ type: 'twitter', saved: 0, skipped: 0 })
    }

    // ジョブを完了
    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        result: {
          totalSaved,
          totalSkipped,
          results
        },
        progress: 100,
        endedAt: new Date()
      }
    })
  } catch (error) {
    throw error
  }
}

// RSS収集（改良版）
async function collectRSS(jobId: string) {
  const rssSources = await prisma.newsSource.findMany({
    where: {
      type: 'RSS',
      active: true
    }
  })

  let saved = 0
  let skipped = 0
  const total = rssSources.length

  for (let i = 0; i < rssSources.length; i++) {
    const source = rssSources[i]
    
    // 進捗を更新
    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        progress: Math.floor((i / total) * 100),
        total
      }
    })

    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BuzzFlow/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(10000), // 10秒タイムアウト
      })

      if (!response.ok) continue

      const text = await response.text()
      
      // 簡易パーサー（最初の5件のみ）
      const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || []
      
      for (let j = 0; j < Math.min(5, itemMatches.length); j++) {
        const item = itemMatches[j]
        const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || ''
        const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || ''
        const description = item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || ''
        
        if (title && link) {
          // URLが既に存在するかチェック
          const existing = await prisma.newsArticle.findUnique({
            where: { url: link }
          })

          if (!existing) {
            // HTMLタグを除去
            const cleanDescription = description
              .replace(/<[^>]*>/g, '')
              .replace(/&[^;]+;/g, ' ')
              .trim()

            await prisma.newsArticle.create({
              data: {
                sourceId: source.id,
                title: title.substring(0, 500),
                summary: cleanDescription.substring(0, 1000),
                content: cleanDescription,
                url: link,
                publishedAt: new Date(),
                category: source.category,
              }
            })
            saved++
          } else {
            skipped++
          }
        }
      }
    } catch (error) {
      console.error(`Error collecting from ${source.name}:`, error)
    }
  }

  return { saved, skipped }
}