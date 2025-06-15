import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // 詳細なデバッグ情報
    const debugInfo = {
      session: {
        id: session.id,
        status: session.status,
        currentPhase: session.currentPhase,
        currentStep: session.currentStep,
        lastError: session.lastError,
        retryCount: session.retryCount,
        totalTokens: session.totalTokens,
        totalDuration: session.totalDuration,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        completedAt: session.completedAt
      },
      phases: session.phases.map(phase => ({
        phaseNumber: phase.phaseNumber,
        status: phase.status,
        hasThinkResult: !!phase.thinkResult,
        hasExecuteResult: !!phase.executeResult,
        hasIntegrateResult: !!phase.integrateResult,
        thinkTokens: phase.thinkTokens,
        executeDuration: phase.executeDuration,
        integrateTokens: phase.integrateTokens,
        // 結果の詳細（エラーがある場合のみ）
        executeResultPreview: phase.executeResult && 
          typeof phase.executeResult === 'object' && 
          'error' in phase.executeResult ? phase.executeResult : null
      }))
    }
    
    return NextResponse.json(debugInfo)
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Debug API error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}