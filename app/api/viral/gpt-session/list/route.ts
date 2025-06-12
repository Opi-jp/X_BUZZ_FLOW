import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const sessions = await prisma.gptAnalysis.findMany({
      where: {
        analysisType: 'comprehensive'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        metadata: session.metadata,
        tokens: session.tokens,
        duration: session.duration
      }))
    })

  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    
    return NextResponse.json(
      { error: 'セッション一覧の取得でエラーが発生しました' },
      { status: 500 }
    )
  }
}