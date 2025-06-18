import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // セッション取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        drafts: {
          orderBy: { conceptNumber: 'asc' }
        },
        phases: true
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    // phasesデータを整形（PhaseProgressV2用の配列形式）
    const phasesArray = session.phases.map(phase => ({
      number: phase.phaseNumber,
      status: phase.integrateResult ? 'completed' : 
              phase.executeResult ? 'processing' : 
              phase.thinkResult ? 'processing' : 'pending',
      thinkResult: phase.thinkResult,
      executeResult: phase.executeResult,
      integrateResult: phase.integrateResult,
      error: phase.error || null
    }))

    // phasesデータを整形（後方互換性用のマップ形式）
    const phaseMap: any = {}
    session.phases.forEach(phase => {
      phaseMap[`phase${phase.phaseNumber}`] = {
        think: phase.thinkResult ? {
          result: phase.thinkResult,
          completedAt: phase.thinkAt?.toISOString(),
          tokens: phase.thinkTokens
        } : null,
        execute: phase.executeResult ? {
          result: phase.executeResult,
          completedAt: phase.executeAt?.toISOString()
        } : null,
        integrate: phase.integrateResult ? {
          result: phase.integrateResult,
          completedAt: phase.integrateAt?.toISOString(),
          tokens: phase.integrateTokens
        } : null
      }
    })
    const phases = phaseMap
    
    // 結果を整形して返す
    const response = {
      id: session.id,
      status: session.status,
      theme: session.theme,
      style: session.style,
      platform: session.platform,
      config: {
        theme: session.theme,
        style: session.style,
        platform: session.platform
      },
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      phaseProgress: session.currentPhase - 1, // 完了したフェーズ数
      
      // PhaseProgressV2用のphasesデータ
      phases: phasesArray,
      
      // メタデータ（表示用）
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      
      // 各フェーズの結果を個別に格納（後方互換性のため）
      phase1Result: phases.phase1?.integrate?.result || null,
      phase2Result: phases.phase2?.integrate?.result || null,
      phase3Result: phases.phase3?.integrate?.result || null,
      phase4Result: phases.phase4?.integrate?.result || null,
      phase5Result: phases.phase5?.integrate?.result || null,
      
      // 詳細な結果データ
      phaseResults: {
        phase1: phases.phase1 || null,
        phase2: phases.phase2 || null,
        phase3: phases.phase3 || null,
        phase4: phases.phase4 || null,
        phase5: phases.phase5 || null
      },
      
      // 下書き
      drafts: session.drafts,
      
      // メタデータ
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      totalTokens: session.totalTokens,
      totalDuration: session.totalDuration
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[GET /api/viral/cot-session/[sessionId]] Error:', error)
    return NextResponse.json(
      { 
        error: 'セッション取得でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}