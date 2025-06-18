import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // セッション取得
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 下書き取得
    const drafts = await prisma.viralDraftV2.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'desc' }
    })

    // キャラクター情報を取得（今はハードコードだが、将来的にはDBから）
    let character = null
    if (session.characterProfileId) {
      const { DEFAULT_CHARACTERS } = await import('@/types/character')
      character = DEFAULT_CHARACTERS.find(c => c.id === session.characterProfileId)
    }

    return NextResponse.json({
      drafts,
      character: character ? {
        id: character.id,
        name: character.name,
        catchphrase: character.catchphrase
      } : null
    })

  } catch (error) {
    console.error('[Get Drafts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}