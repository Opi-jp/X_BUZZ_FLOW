import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// セッションのデータを複製して新しいセッションを作成
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const { 
      includeTopics = true,
      includeConcepts = false,
      newTheme = null,
      newPlatform = null,
      newStyle = null
    } = await request.json()
    
    // 元のセッションを取得
    const sourceSession = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    if (!sourceSession) {
      return NextResponse.json(
        { error: 'Source session not found' },
        { status: 404 }
      )
    }

    // 新しいセッションを作成
    const newSession = await prisma.viralSession.create({
      data: {
        theme: newTheme || sourceSession.theme,
        platform: newPlatform || sourceSession.platform,
        style: newStyle || sourceSession.style,
        status: 'CREATED',
        // データの選択的複製
        ...(includeTopics && sourceSession.topics ? {
          topics: sourceSession.topics,
          status: 'TOPICS_COLLECTED'
        } : {}),
        ...(includeConcepts && sourceSession.concepts ? {
          concepts: sourceSession.concepts,
          status: 'CONCEPTS_GENERATED'
        } : {})
      }
    })

    return NextResponse.json({
      success: true,
      sourceSessionId: id,
      newSessionId: newSession.id,
      cloned: {
        topics: includeTopics && !!sourceSession.topics,
        concepts: includeConcepts && !!sourceSession.concepts
      },
      newSession
    })

  } catch (error) {
    console.error('[Clone Session] Error:', error)
    return NextResponse.json(
      { error: 'Failed to clone session' },
      { status: 500 }
    )
  }
}