import { NextRequest, NextResponse } from 'next/server'
import { DBManager } from '@/lib/core/unified-system-manager'
import { ErrorManager } from '@/lib/core/unified-system-manager'
import { ClaudeLogger } from '@/lib/core/claude-logger'
import { z } from 'zod'

// リクエストボディのスキーマ
const UpdateSessionSchema = z.object({
  updates: z.object({
    status: z.string().optional(),
    topics: z.any().optional(),
    concepts: z.any().optional(),
    selected_ids: z.array(z.string()).optional(),
    contents: z.any().optional(),
    character_profile_id: z.string().optional(),
    voice_style_mode: z.string().optional(),
    current_step: z.string().optional(),
    error: z.string().optional()
  })
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const sessionId = params.id

  try {
    // リクエストボディの解析
    const body = await request.json()
    const { updates } = UpdateSessionSchema.parse(body)

    ClaudeLogger.info(
      { module: 'api', operation: 'update-session', sessionId },
      'Updating session',
      { updates }
    )

    // 存在するフィールドのみを抽出
    const allowedFields = ['status', 'topics', 'concepts', 'selected_ids', 'contents', 'character_profile_id', 'voice_style_mode']
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    )

    // DBからセッションを更新
    const updatedSession = await DBManager.transaction(async (tx) => {
      // 現在のセッションを取得
      const currentSession = await tx.viral_sessions.findUnique({
        where: { id: sessionId }
      })

      if (!currentSession) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // セッションを更新
      const updated = await tx.viral_sessions.update({
        where: { id: sessionId },
        data: filteredUpdates
      })

      // アクティビティログを記録
      await tx.session_activity_logs.create({
        data: {
          session_id: sessionId,
          session_type: 'viral_session',
          activity_type: 'SESSION_UPDATED',
          details: updates
        }
      })

      return updated
    })

    ClaudeLogger.info(
      { module: 'api', operation: 'update-session', sessionId },
      'Session updated successfully',
      { newStatus: updatedSession.status }
    )

    return NextResponse.json({
      success: true,
      session: updatedSession
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // エラーログ記録
    const errorId = await ErrorManager.logError(error, {
      module: 'create',
      operation: 'update-session',
      sessionId
    })

    ClaudeLogger.error(
      { module: 'api', operation: 'update-session', sessionId },
      'Failed to update session',
      error,
      { errorId }
    )

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorId
      },
      { status: 500 }
    )
  }
}