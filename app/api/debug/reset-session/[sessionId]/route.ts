import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // セッションをリセット
    const updatedSession = await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        currentPhase: 1,
        currentStep: 'THINK',
        retryCount: 0,
        lastError: null,
        nextRetryAt: null,
        updatedAt: new Date()
      }
    })
    
    // 関連するフェーズデータも削除（クリーンスタート）
    await prisma.cotPhase.deleteMany({
      where: { sessionId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'セッションをリセットしました',
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        expertise: updatedSession.expertise,
        currentPhase: updatedSession.currentPhase,
        currentStep: updatedSession.currentStep
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}