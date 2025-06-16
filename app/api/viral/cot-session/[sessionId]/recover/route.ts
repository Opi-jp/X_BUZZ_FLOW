import { NextRequest, NextResponse } from 'next/server'
import { CotSessionManager } from '@/lib/cot-session-manager'

const sessionManager = new CotSessionManager()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    
    const { action, phaseNumber } = body
    
    console.log(`[RECOVER] Session ${sessionId}, Action: ${action}`)
    
    let result
    
    switch (action) {
      case 'retry':
        result = await sessionManager.retrySession(sessionId)
        break
        
      case 'restart_phase':
        if (!phaseNumber) {
          return NextResponse.json(
            { error: 'phaseNumber required for restart_phase' },
            { status: 400 }
          )
        }
        result = await sessionManager.restartFromPhase(sessionId, phaseNumber)
        break
        
      case 'restart_session':
        result = await sessionManager.restartSession(sessionId, 'User requested')
        break
        
      case 'health_check':
        const health = await sessionManager.checkSessionHealth(sessionId)
        return NextResponse.json(health)
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('[RECOVER] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recovery failed' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // 健全性チェックと推奨アクション
    const health = await sessionManager.checkSessionHealth(sessionId)
    
    return NextResponse.json({
      sessionId,
      health,
      availableActions: [
        { action: 'retry', description: '現在のステップをリトライ' },
        { action: 'restart_phase', description: '特定のフェーズから再開' },
        { action: 'restart_session', description: '新しいセッションで最初から' }
      ]
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check failed' },
      { status: 500 }
    )
  }
}