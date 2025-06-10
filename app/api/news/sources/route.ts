import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRangeForDB } from '@/lib/date-utils'

// GET: ニュースソース一覧取得
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータから日付を取得
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    
    const sources = await prisma.newsSource.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { articles: true }
        }
      }
    })

    // 日付が指定されている場合は、その日の記事数も取得
    if (date) {
      const { start, end } = getDateRangeForDB(date)
      
      // 各ソースの日付別記事数を取得
      const sourcesWithDateCount = await Promise.all(
        sources.map(async (source) => {
          const dateCount = await prisma.newsArticle.count({
            where: {
              sourceId: source.id,
              publishedAt: {
                gte: start,
                lt: end
              }
            }
          })
          
          return {
            ...source,
            dateCount // 指定日の記事数
          }
        })
      )
      
      return NextResponse.json(sourcesWithDateCount)
    }
    
    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching news sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news sources' },
      { status: 500 }
    )
  }
}

// POST: ニュースソース追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, type, category } = body

    const source = await prisma.newsSource.create({
      data: {
        name,
        url,
        type: type || 'RSS',
        category: category || 'AI',
      }
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error creating news source:', error)
    return NextResponse.json(
      { error: 'Failed to create news source' },
      { status: 500 }
    )
  }
}