import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    
    const session = await prisma.viralSession.findUnique({
      where: { id },
      select: {
        id: true,
        theme: true,
        platform: true,
        style: true,
        status: true,
        currentPhase: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        topics: true,
        concepts: true,
        selectedConcepts: true,
        claudeData: true
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 進捗状況を判定
    const progress = {
      phase1_collecting: !!session.topics,
      phase2_concepts: !!session.concepts,
      phase3_contents: !!session.claudeData,
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
    } else if (progress.phase2_concepts && !session.selectedConcepts) {
      currentStep = 'awaiting_concept_selection'
      nextAction = 'select_concepts'
    } else if (progress.phase2_concepts && session.selectedConcepts) {
      currentStep = 'awaiting_character_selection'
      nextAction = 'select_character'
    } else if (progress.phase1_collecting) {
      currentStep = 'generating_concepts'
    } else {
      currentStep = 'collecting_topics'
    }

    return NextResponse.json({
      id: session.id,
      theme: session.theme,
      currentStep,
      nextAction,
      progress,
      error: session.errorMessage,
      data: {
        topics: session.topics ? 'collected' : null,
        concepts: session.concepts,
        selectedConcepts: session.selectedConcepts,
        contents: session.claudeData
      }
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}