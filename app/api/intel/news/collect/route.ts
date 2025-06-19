import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Intel Module - News Collection API
 * 
 * 責務: ニュース記事の収集と初期保存
 * 
 * データフロー:
 * 外部API/RSS → Raw Layer (DB保存) → Process Layer → Display Layer
 */

// リクエストバリデーション
const CollectRequestSchema = z.object({
  sources: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  force: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // リクエストボディの検証
    const body = await request.json()
    const { sources, limit, force } = CollectRequestSchema.parse(body)

    // 既存の収集ロジックを呼び出す（後で実装を移行）
    // TODO: /api/intelligence/news/collect のロジックを移行
    
    // 一時的なモック実装
    const result = {
      collected: 0,
      sources: sources || ['default'],
      timestamp: new Date().toISOString(),
      status: 'pending'
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'News collection started'
    })
    
  } catch (error) {
    console.error('[Intel/News/Collect] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 最新の収集状況を返す
    const latestJob = await prisma.newsCollectionJob.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    })

    if (!latestJob) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No collection jobs found'
      })
    }

    // Display Layer用のデータ変換
    const displayData = {
      id: latestJob.id,
      status: latestJob.status,
      articlesCount: latestJob._count.articles,
      startedAt: latestJob.createdAt,
      completedAt: latestJob.completedAt,
      source: latestJob.sourceType
    }

    return NextResponse.json({
      success: true,
      data: displayData
    })
    
  } catch (error) {
    console.error('[Intel/News/Collect] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}