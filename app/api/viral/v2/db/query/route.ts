import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 汎用的なDB検索API - 柔軟にデータを取得
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      table,
      where = {},
      select = {},
      include = {},
      orderBy = {},
      take,
      skip,
      distinct
    } = body

    // 利用可能なテーブル
    const tables = {
      sessions: prisma.viralSession,
      drafts: prisma.viralDraftV2,
      performance: prisma.viralDraftPerformance
    }

    if (!tables[table as keyof typeof tables]) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    const queryOptions: any = {}
    
    if (Object.keys(where).length > 0) queryOptions.where = where
    if (Object.keys(select).length > 0) queryOptions.select = select
    if (Object.keys(include).length > 0) queryOptions.include = include
    if (Object.keys(orderBy).length > 0) queryOptions.orderBy = orderBy
    if (take) queryOptions.take = take
    if (skip) queryOptions.skip = skip
    if (distinct) queryOptions.distinct = distinct

    const data = await (tables[table as keyof typeof tables] as any).findMany(queryOptions)

    return NextResponse.json({
      table,
      count: data.length,
      data
    })

  } catch (error) {
    console.error('[DB Query] Error:', error)
    return NextResponse.json(
      { error: 'Query failed', details: error.message },
      { status: 500 }
    )
  }
}

// 使用例のドキュメント
export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/viral/v2/db/query',
    examples: [
      {
        description: '最新のセッションを5件取得',
        body: {
          table: 'sessions',
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      {
        description: '特定テーマのトピックを含むセッション',
        body: {
          table: 'sessions',
          where: {
            theme: 'AIと働き方',
            topics: { not: null }
          },
          select: {
            id: true,
            theme: true,
            topics: true,
            createdAt: true
          }
        }
      },
      {
        description: 'キャラクター別の下書き',
        body: {
          table: 'drafts',
          where: { characterId: 'cardi-dare' },
          include: {
            session: {
              select: { theme: true, platform: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    ]
  })
}