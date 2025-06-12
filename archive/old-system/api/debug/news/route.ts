import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 分析済み記事の数を確認
    const analyzedCount = await prisma.newsArticle.count({
      where: {
        importance: {
          not: null
        }
      }
    })

    // 重要度0.7以上の記事数を確認
    const highImportanceCount = await prisma.newsArticle.count({
      where: {
        importance: {
          gte: 0.7
        }
      }
    })

    // 最新の分析済み記事を5件取得
    const latestAnalyzed = await prisma.newsArticle.findMany({
      where: {
        importance: {
          not: null
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 5,
      include: {
        source: true,
        analysis: true
      }
    })

    // 全記事数を確認
    const totalCount = await prisma.newsArticle.count()

    return NextResponse.json({
      totalArticles: totalCount,
      analyzedArticles: analyzedCount,
      highImportanceArticles: highImportanceCount,
      latestAnalyzedArticles: latestAnalyzed.map(article => ({
        id: article.id,
        title: article.title,
        importance: article.importance,
        processed: article.processed,
        metadata: article.metadata,
        analysis: article.analysis,
        publishedAt: article.publishedAt
      }))
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Failed to debug news data' },
      { status: 500 }
    )
  }
}