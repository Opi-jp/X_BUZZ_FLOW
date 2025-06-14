import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId },
      include: {
        drafts: true
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        metadata: session.metadata,
        response: session.response,
        tokens: session.tokens,
        duration: session.duration,
        drafts: session.drafts
      }
    })

  } catch (error) {
    console.error('Failed to fetch session:', error)
    
    return NextResponse.json(
      { error: 'セッション取得でエラーが発生しました' },
      { status: 500 }
    )
  }
}