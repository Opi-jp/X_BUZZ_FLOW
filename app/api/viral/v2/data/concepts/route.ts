import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// シンプルにDBから全てのコンセプトデータを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // DBから直接取得
    const sessions = await prisma.viralSession.findMany({
      where: {
        concepts: { not: null },
        ...(theme ? { theme } : {})
      },
      select: {
        id: true,
        theme: true,
        createdAt: true,
        concepts: true,
        topics: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // コンセプトデータをフラットに展開
    const allConcepts = sessions.flatMap(session => {
      const concepts = (session.concepts as any[]) || []
      return concepts.map((concept: any) => ({
        sessionId: session.id,
        sessionTheme: session.theme,
        sessionDate: session.createdAt,
        ...concept
      }))
    })

    return NextResponse.json({
      total: allConcepts.length,
      concepts: allConcepts,
      sessions: sessions.length
    })

  } catch (error) {
    console.error('[Get Concepts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    )
  }
}