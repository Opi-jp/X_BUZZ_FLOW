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
        phases: true
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    // buildSafeContextの内容を再現
    const baseContext = {
      expertise: session.expertise || 'AIと働き方',
      style: session.style || '洞察的',
      platform: session.platform || 'Twitter',
    }
    
    const userConfig = {
      expertise: baseContext.expertise,
      style: baseContext.style,
      platform: baseContext.platform
    }
    
    const context = {
      ...baseContext,
      userConfig
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      session: {
        id: session.id,
        expertise: session.expertise,
        style: session.style,
        platform: session.platform,
        status: session.status
      },
      context,
      contextKeys: Object.keys(context),
      baseContext,
      userConfig
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}