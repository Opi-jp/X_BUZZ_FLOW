import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// シンプルにDBから全てのトピックデータを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // DBから直接取得
    const sessions = await prisma.viralSession.findMany({
      where: {
        topics: { not: null },
        ...(theme ? { theme } : {})
      },
      select: {
        id: true,
        theme: true,
        createdAt: true,
        topics: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // トピックデータをフラットに展開
    const allTopics = sessions.flatMap(session => {
      const topics = (session.topics as any).parsed || []
      return topics.map((topic: any) => ({
        sessionId: session.id,
        sessionTheme: session.theme,
        sessionDate: session.createdAt,
        ...topic
      }))
    })

    return NextResponse.json({
      total: allTopics.length,
      topics: allTopics,
      sessions: sessions.length
    })

  } catch (error) {
    console.error('[Get Topics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    )
  }
}