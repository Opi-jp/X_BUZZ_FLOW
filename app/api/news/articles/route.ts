import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRangeForDB } from '@/lib/date-utils'

// GET: ニュース記事一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const processed = searchParams.get('processed')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    
    // 日付フィルター（JST基準）
    if (date) {
      const { start, end } = getDateRangeForDB(date)
      
      where.publishedAt = {
        gte: start,
        lt: end
      }
    }

    // 処理済みフィルター
    if (processed !== null) {
      where.processed = processed === 'true'
    }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        include: {
          source: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.newsArticle.count({ where })
    ])

    return NextResponse.json({
      articles,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching news articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news articles' },
      { status: 500 }
    )
  }
}