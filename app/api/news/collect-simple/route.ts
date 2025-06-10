import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: シンプルなテスト収集（外部APIを使わない）
export async function POST(request: NextRequest) {
  try {
    // テスト用ソースを確保
    let testSource = await prisma.newsSource.findFirst({
      where: { type: 'TEST' }
    })

    if (!testSource) {
      testSource = await prisma.newsSource.create({
        data: {
          name: 'Simple Test Source',
          url: 'https://test.example.com/simple',
          type: 'TEST',
          category: 'AI',
          active: true,
        }
      })
    }

    // サンプルニュースデータ
    const sampleNews = [
      {
        title: 'OpenAI announces o1 reasoning model',
        summary: 'OpenAI has released a new model that can reason through complex problems step by step.',
        importance: 0.9,
      },
      {
        title: 'Google updates Gemini with new capabilities',
        summary: 'Google\'s Gemini model now supports longer context windows and improved multilingual support.',
        importance: 0.8,
      },
      {
        title: 'Anthropic improves Claude\'s coding abilities',
        summary: 'Claude can now handle more complex programming tasks with better accuracy.',
        importance: 0.85,
      },
      {
        title: 'Meta releases new open-source LLM',
        summary: 'Meta\'s latest language model is available for research and commercial use.',
        importance: 0.75,
      },
      {
        title: 'Microsoft integrates AI into Office suite',
        summary: 'Copilot features are now available across all Office applications.',
        importance: 0.7,
      },
    ]

    let savedCount = 0
    const timestamp = Date.now()

    for (const [index, news] of sampleNews.entries()) {
      try {
        const url = `https://test.example.com/simple/${timestamp}-${index}`
        
        await prisma.newsArticle.create({
          data: {
            sourceId: testSource.id,
            title: news.title,
            summary: news.summary,
            content: news.summary,
            url,
            publishedAt: new Date(Date.now() - index * 3600000), // 1時間ずつ過去に
            category: 'AI',
            importance: news.importance,
            processed: true,
            metadata: {
              analysis: {
                category: 'test',
                summary: news.summary,
                japaneseSummary: news.summary,
                keyPoints: ['Important point 1', 'Important point 2'],
                impact: 'high',
                analyzedAt: new Date().toISOString(),
              }
            }
          }
        })
        savedCount++
      } catch (error) {
        console.error('Error creating sample article:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${savedCount}件のサンプル記事を作成しました`,
      saved: savedCount,
    })
  } catch (error) {
    console.error('Error in simple collection:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create sample data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}