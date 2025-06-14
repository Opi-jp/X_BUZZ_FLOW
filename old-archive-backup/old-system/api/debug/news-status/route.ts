import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 全記事数
    const totalArticles = await prisma.newsArticle.count()
    
    // 処理済み記事数
    const processedArticles = await prisma.newsArticle.count({
      where: { processed: true }
    })
    
    // 重要度0.7以上の記事数
    const highImportanceArticles = await prisma.newsArticle.count({
      where: { importance: { gte: 0.7 } }
    })
    
    // 最新の分析済み記事（上位5件）
    const latestAnalyzedArticles = await prisma.newsArticle.findMany({
      where: {
        processed: true,
        importance: { not: null }
      },
      orderBy: [
        { importance: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: 5,
      include: {
        source: true,
        analysis: true
      }
    })
    
    // 24時間以内の記事数
    const recentArticles = await prisma.newsArticle.count({
      where: {
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
    
    // AI関連キーワードを含む未処理記事
    const aiRelatedUnprocessed = await prisma.newsArticle.findMany({
      where: {
        processed: false,
        OR: [
          { title: { contains: 'AI', mode: 'insensitive' } },
          { title: { contains: 'GPT', mode: 'insensitive' } },
          { title: { contains: 'Claude', mode: 'insensitive' } },
          { title: { contains: 'OpenAI', mode: 'insensitive' } }
        ]
      },
      take: 5,
      orderBy: { publishedAt: 'desc' }
    })
    
    return NextResponse.json({
      summary: {
        totalArticles,
        processedArticles,
        unprocessedArticles: totalArticles - processedArticles,
        highImportanceArticles,
        recentArticles24h: recentArticles,
        processingRate: totalArticles > 0 ? ((processedArticles / totalArticles) * 100).toFixed(1) + '%' : '0%'
      },
      latestAnalyzedArticles: latestAnalyzedArticles.map(article => ({
        id: article.id,
        title: article.title,
        source: article.source.name,
        importance: article.importance,
        publishedAt: article.publishedAt,
        hasAnalysis: !!article.analysis,
        analysis: article.analysis ? {
          category: article.analysis.category,
          impact: article.analysis.impact,
          keyPointsCount: article.analysis.keyPoints.length,
          hasJapaneseSummary: !!article.analysis.japaneseSummary
        } : null
      })),
      aiRelatedUnprocessed: aiRelatedUnprocessed.map(article => ({
        id: article.id,
        title: article.title,
        publishedAt: article.publishedAt
      })),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Debug news status error:', error)
    return NextResponse.json(
      { error: 'デバッグ情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}