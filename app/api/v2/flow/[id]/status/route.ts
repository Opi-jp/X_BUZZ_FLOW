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
        // 進捗に応じてデータを含める
        topics: true,
        concepts: true,
        claudeData: true
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 進捗状況をわかりやすく整理
    const progress = {
      collecting: !!session.topics,
      conceptsGenerated: !!session.concepts,
      contentsGenerated: !!session.claudeData,
      completed: session.status === 'COMPLETED'
    }

    // 現在のステップを判定
    let currentStep = 'initializing'
    if (session.status === 'ERROR') {
      currentStep = 'error'
    } else if (progress.completed) {
      currentStep = 'completed'
    } else if (progress.contentsGenerated) {
      currentStep = 'finalizing'
    } else if (progress.conceptsGenerated) {
      currentStep = 'generating_contents'
    } else if (progress.collecting) {
      currentStep = 'generating_concepts'
    } else {
      currentStep = 'collecting'
    }

    // レスポンスをシンプルに
    return NextResponse.json({
      id: session.id,
      theme: session.theme,
      currentStep,
      progress,
      error: session.errorMessage,
      // 必要なデータのみ返す
      data: {
        topics: session.topics ? 
          (typeof session.topics === 'string' ? 
            { raw: session.topics.substring(0, 200) + '...' } : 
            session.topics) : null,
        concepts: session.concepts ? 
          (Array.isArray(session.concepts) ? 
            session.concepts.length : 
            'processing') : null,
        contents: session.claudeData ? 
          (Array.isArray(session.claudeData) ? 
            session.claudeData.length : 
            'processing') : null
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