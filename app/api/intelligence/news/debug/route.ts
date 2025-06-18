import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: デバッグ情報を取得
export async function GET(request: NextRequest) {
  try {
    // 分析済み記事の数を確認
    const analyzedCount = await prisma.newsArticle.count({
      where: {
        processed: true,
        importance: { not: null }
      }
    })

    // 最新の分析済み記事を取得
    const latestAnalyzed = await prisma.newsArticle.findMany({
      where: {
        processed: true,
        importance: { not: null }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        importance: true,
        processed: true
      }
    })

    // 全記事数
    const totalCount = await prisma.newsArticle.count()

    // 未処理記事数
    const unprocessedCount = await prisma.newsArticle.count({
      where: {
        processed: false
      }
    })

    return NextResponse.json({
      analyzedCount,
      totalCount,
      unprocessedCount,
      latestAnalyzed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}