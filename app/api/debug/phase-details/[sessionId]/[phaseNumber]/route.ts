import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string, phaseNumber: string }> }
) {
  try {
    const { sessionId, phaseNumber } = await params
    const phaseNum = parseInt(phaseNumber)
    
    const phase = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: phaseNum
        }
      }
    })
    
    if (!phase) {
      return NextResponse.json({
        exists: false,
        sessionId,
        phaseNumber: phaseNum
      })
    }
    
    return NextResponse.json({
      exists: true,
      sessionId,
      phaseNumber: phaseNum,
      status: phase.status,
      hasThinkResult: !!phase.thinkResult,
      hasExecuteResult: !!phase.executeResult,
      hasIntegrateResult: !!phase.integrateResult,
      thinkResult: phase.thinkResult,
      executeResult: phase.executeResult,
      integrateResult: phase.integrateResult,
      timestamps: {
        created: phase.createdAt,
        think: phase.thinkAt,
        execute: phase.executeAt,
        integrate: phase.integrateAt
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}