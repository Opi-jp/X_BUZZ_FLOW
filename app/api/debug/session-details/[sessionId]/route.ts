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
          select: {
            phaseNumber: true,
            status: true,
            thinkResult: true,
            executeResult: true,
            integrateResult: true,
            createdAt: true,
            thinkAt: true,
            executeAt: true,
            integrateAt: true
          }
        }
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    // セッションデータの詳細分析
    const analysis = {
      sessionId: session.id,
      status: session.status,
      expertise: session.expertise,
      style: session.style,
      platform: session.platform,
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      retryCount: session.retryCount,
      lastError: session.lastError,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      timeSinceUpdate: Date.now() - new Date(session.updatedAt).getTime(),
      phases: session.phases.map(phase => ({
        number: phase.phaseNumber,
        status: phase.status,
        hasThinkResult: !!phase.thinkResult,
        hasExecuteResult: !!phase.executeResult,
        hasIntegrateResult: !!phase.integrateResult,
        timestamps: {
          created: phase.createdAt,
          think: phase.thinkAt,
          execute: phase.executeAt,
          integrate: phase.integrateAt
        }
      })),
      diagnostics: {
        hasExpertise: !!session.expertise,
        hasStyle: !!session.style,
        hasPlatform: !!session.platform,
        expertiseValue: session.expertise || 'MISSING',
        styleValue: session.style || 'MISSING',
        platformValue: session.platform || 'MISSING'
      }
    }
    
    return NextResponse.json(analysis)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}