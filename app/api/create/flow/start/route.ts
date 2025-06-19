import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Create Module - Flow Start API
 * 
 * 責務: コンテンツ生成フローの開始
 * 
 * フロー: Intel → Create (Perplexity → GPT → Claude) → Publish
 */

// リクエストバリデーション
const StartFlowSchema = z.object({
  theme: z.string().min(1).max(200),
  platform: z.enum(['Twitter', 'LinkedIn', 'Instagram']).default('Twitter'),
  style: z.enum(['エンターテイメント', 'ビジネス', '教育', 'ニュース']).default('エンターテイメント'),
  sourceType: z.enum(['news', 'trend', 'manual']).optional(),
  sourceId: z.string().optional()
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
    const { theme, platform, style, sourceType, sourceId } = StartFlowSchema.parse(body)

    // 新しいセッションを作成
    const newSession = await prisma.viralSession.create({
      data: {
        userId: session.user.id,
        theme,
        platform,
        style,
        status: 'CREATED',
        metadata: {
          sourceType,
          sourceId,
          startedAt: new Date().toISOString()
        }
      }
    })

    // TODO: 非同期でPerplexity処理を開始
    // 既存の /api/generation/content/sessions のロジックを移行

    // Display Layer用のレスポンス
    return NextResponse.json({
      success: true,
      data: {
        sessionId: newSession.id,
        status: newSession.status,
        theme: newSession.theme,
        nextStep: 'collecting_topics',
        estimatedTime: '3-5 minutes'
      },
      message: 'Content generation flow started'
    })
    
  } catch (error) {
    console.error('[Create/Flow/Start] Error:', error)
    
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

// セッション一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')

    // セッション一覧を取得
    const sessions = await prisma.viralSession.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        theme: true,
        status: true,
        createdAt: true,
        platform: true,
        style: true
      }
    })

    // Summary View用のデータ
    const summaryData = sessions.map(s => ({
      id: s.id,
      theme: s.theme.substring(0, 50) + (s.theme.length > 50 ? '...' : ''),
      status: s.status,
      createdAt: s.createdAt,
      platform: s.platform,
      style: s.style
    }))

    return NextResponse.json({
      success: true,
      data: summaryData,
      total: sessions.length
    })
    
  } catch (error) {
    console.error('[Create/Flow/Start] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}