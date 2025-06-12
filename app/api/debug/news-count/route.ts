import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 全ニュース記事数
    const totalCount = await prisma.newsArticle.count()
    
    // 処理済みニュース記事数
    const processedCount = await prisma.newsArticle.count({
      where: { processed: true }
    })
    
    // 過去48時間以内の処理済みニュース
    const recentProcessedCount = await prisma.newsArticle.count({
      where: {
        publishedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        processed: true
      }
    })
    
    // 最新のニュース記事を5件取得
    const latestNews = await prisma.newsArticle.findMany({
      where: { processed: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      include: { 
        source: true,
        analysis: true 
      }
    })

    return NextResponse.json({
      totalCount,
      processedCount,
      recentProcessedCount,
      latestNews: latestNews.map(n => ({
        title: n.title,
        source: n.source.name,
        publishedAt: n.publishedAt,
        processed: n.processed,
        hasAnalysis: !!n.analysis
      }))
    })
  } catch (error) {
    console.error('Debug news count error:', error)
    return NextResponse.json({ error: 'Failed to get news count' }, { status: 500 })
  }
}