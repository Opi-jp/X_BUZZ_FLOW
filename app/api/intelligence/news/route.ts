import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: ニュース記事一覧取得（簡易版）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true'

    const articles = await prisma.newsArticle.findMany({
      include: {
        source: true,
        analysis: includeAnalysis,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({
      articles,
    })
  } catch (error) {
    console.error('Error fetching news articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news articles' },
      { status: 500 }
    )
  }
}