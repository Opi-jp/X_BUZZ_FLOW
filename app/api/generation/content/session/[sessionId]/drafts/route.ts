import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // セッション情報を取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        drafts: {
          orderBy: { conceptNumber: 'asc' }
        }
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      sessionId,
      status: session.status,
      drafts: session.drafts,
      totalDrafts: session.drafts.length,
      createdAt: session.createdAt,
      completedAt: session.completedAt
    })
    
  } catch (error) {
    console.error('Get drafts error:', error)
    return NextResponse.json(
      { 
        error: '下書きの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}