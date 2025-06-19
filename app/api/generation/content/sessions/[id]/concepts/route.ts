import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { selectedConceptIds } = body

    if (!selectedConceptIds || !Array.isArray(selectedConceptIds)) {
      return NextResponse.json(
        { error: 'Selected concept IDs are required' },
        { status: 400 }
      )
    }

    // セッションを取得
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (!session.concepts || !Array.isArray(session.concepts)) {
      return NextResponse.json(
        { error: 'No concepts found in session' },
        { status: 400 }
      )
    }

    // 選択されたコンセプトのみをフィルタリング
    const allConcepts = session.concepts as any[]
    const selectedConcepts = allConcepts.filter(
      concept => selectedConceptIds.includes(concept.conceptId)
    )

    if (selectedConcepts.length === 0) {
      return NextResponse.json(
        { error: 'No valid concepts selected' },
        { status: 400 }
      )
    }

    // セッションを更新（選択されたコンセプトを保存）
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        selectedConcepts: selectedConcepts,
        currentPhase: 'CHARACTER_SELECTION',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      selectedCount: selectedConcepts.length,
      session: updatedSession
    })
  } catch (error) {
    console.error('Error saving selected concepts:', error)
    return NextResponse.json(
      { error: 'Failed to save selected concepts' },
      { status: 500 }
    )
  }
}