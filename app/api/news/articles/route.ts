import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRangeForDB } from '@/lib/date-utils'

// GET: ニュース記事一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const processed = searchParams.get('processed')
    const analyzed = searchParams.get('analyzed') // 分析済みフィルターを追加
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'publishedAt' // importance or publishedAt
    const sortOrder = searchParams.get('sortOrder') || 'desc' // asc or desc
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true'

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

    // 分析済みフィルター（importanceがnullでない記事）
    if (analyzed === 'true') {
      where.importance = {
        not: null
      }
    }

    // ソート条件を構築
    let orderBy: any = { publishedAt: 'desc' } // デフォルト
    
    if (sortBy === 'importance') {
      // 重要度でソート（nullは最後に）
      orderBy = [
        { importance: sortOrder as 'asc' | 'desc' },
        { publishedAt: 'desc' } // 同じ重要度の場合は日付順
      ]
    } else {
      orderBy = { [sortBy]: sortOrder }
    }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        include: {
          source: true,
          analysis: includeAnalysis, // パラメータに基づいて分析結果を含める
        },
        orderBy,
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