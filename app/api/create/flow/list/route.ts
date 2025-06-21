import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IDGenerator, EntityType, ErrorManager, DBManager } from '@/lib/core/unified-system-manager'
import { claudeLog } from '@/lib/core/claude-logger'

export async function POST(request: Request) {
  let theme: string | undefined
  let platform: string | undefined
  let style: string | undefined
  
  try {
    const body = await request.json()
    theme = body.theme
    platform = body.platform
    style = body.style

    if (!theme || !platform || !style) {
      return NextResponse.json(
        { error: 'theme, platform, style are required' },
        { status: 400 }
      )
    }

    // セッションを作成（トランザクション内で実行）
    const session = await DBManager.transaction(async (tx) => {
      const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)
      
      claudeLog.info(
        { module: 'api', operation: 'session-create' },
        'Creating new session',
        { sessionId, theme, platform, style }
      )
      
      return await tx.viral_sessions.create({
        data: {
          id: sessionId,
          theme,
          platform,
          style,
          status: 'CREATED'
        }
      })
    })

    claudeLog.info(
      { module: 'api', operation: 'session-created' },
      'Session created successfully',
      { sessionId: session.id }
    )

    return NextResponse.json({ 
      success: true,
      session 
    })
  } catch (error) {
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-list',
      operation: 'create-session',
      metadata: { theme, platform, style }
    })
    
    const userMessage = ErrorManager.getUserMessage(error, 'ja')
    
    return NextResponse.json(
      { error: userMessage, errorId },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    claudeLog.info(
      { module: 'api', operation: 'session-list' },
      'Fetching session list',
      { limit }
    )

    const sessions = await prisma.viral_sessions.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { viral_drafts: true }
        },
        viral_drafts: {
          select: {
            id: true,
            content: true,
            created_at: true
          }
        }
      }
    })

    claudeLog.info(
      { module: 'api', operation: 'session-list-success' },
      'Sessions fetched successfully',
      { count: sessions.length }
    )

    return NextResponse.json({ sessions })
  } catch (error) {
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-list',
      operation: 'fetch-sessions'
    })
    
    const userMessage = ErrorManager.getUserMessage(error, 'ja')
    
    return NextResponse.json(
      { error: userMessage, errorId },
      { status: 500 }
    )
  }
}