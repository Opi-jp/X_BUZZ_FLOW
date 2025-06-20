import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ErrorManager, DataTransformer } from '@/lib/core/unified-system-manager'
import { claudeLog } from '@/lib/core/claude-logger'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    claudeLog.info(
      { module: 'api', operation: 'status-check' },
      'Checking session status',
      { sessionId: id }
    )
    
    const session = await prisma.viral_sessions.findUnique({
      where: { id },
      select: {
        id: true,
        theme: true,
        platform: true,
        style: true,
        status: true,
        createdAt: true,
        topics: true,
        concepts: true,
        selectedIds: true,
        contents: true
      }
    })

    if (!session) {
      claudeLog('Session not found', { sessionId: id })
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 進捗状況を判定
    const progress = {
      phase1_collecting: !!session.topics,
      phase2_concepts: !!session.concepts,
      phase3_contents: !!session.contents,
      completed: session.status === 'COMPLETED'
    }

    // 現在のステップ
    let currentStep = 'initializing'
    let nextAction = null
    
    if (session.status === 'ERROR') {
      currentStep = 'error'
    } else if (progress.completed) {
      currentStep = 'completed'
    } else if (progress.phase3_contents) {
      currentStep = 'completed'
    } else if (progress.phase2_concepts && session.selectedIds.length === 0) {
      currentStep = 'awaiting_concept_selection'
      nextAction = 'select_concepts'
    } else if (progress.phase2_concepts && session.selectedIds.length > 0) {
      currentStep = 'awaiting_character_selection'
      nextAction = 'select_character'
    } else if (progress.phase1_collecting) {
      currentStep = 'generating_concepts'
    } else {
      currentStep = 'collecting_topics'
    }

    claudeLog('Session status determined', { 
      sessionId: session.id, 
      currentStep, 
      nextAction 
    })

    return NextResponse.json({
      id: session.id,
      theme: session.theme,
      currentStep,
      nextAction,
      progress,
      error: null,
      data: {
        topics: session.topics,
        concepts: session.concepts,
        selectedConcepts: session.selectedIds,
        contents: session.contents
      }
    })
  } catch (error) {
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-status',
      operation: 'check-status',
      sessionId: id
    })
    
    const userMessage = ErrorManager.getUserMessage(error, 'ja')
    
    return NextResponse.json(
      { error: userMessage, errorId },
      { status: 500 }
    )
  }
}