import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const sessionId = params.id
  
  // SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      let lastStatus = ''
      let retryCount = 0
      const maxRetries = 60 // 60秒でタイムアウト
      
      const checkProgress = async () => {
        try {
          const session = await prisma.viral_sessions.findUnique({
            where: { id: sessionId },
            select: {
              status: true,
              theme: true,
              platform: true,
              style: true,
              topics: true,
              concepts: true,
              selected_ids: true,
              contents: true
            }
          })
          
          if (!session) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Session not found' })}\n\n`))
            controller.close()
            return
          }
          
          // ステータスが変化した場合のみ送信
          if (session.status !== lastStatus) {
            lastStatus = session.status
            
            const progress = {
              status: session.status,
              data: {
                theme: session.theme,
                platform: session.platform,
                style: session.style,
                hasTopics: !!session.topics,
                hasConcepts: !!session.concepts,
                selectedIds: session.selected_ids,
                hasContents: !!session.contents
              },
              currentStep: getStepFromStatus(session.status),
              progress: calculateProgress(session.status)
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
            
            // 完了状態になったら接続を閉じる
            if (session.status === 'DRAFTS_CREATED') {
              controller.close()
              return
            }
          }
          
          // 1秒後に再チェック
          retryCount++
          if (retryCount < maxRetries) {
            setTimeout(checkProgress, 1000)
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Timeout' })}\n\n`))
            controller.close()
          }
          
        } catch (error) {
          console.error('Progress check error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Internal error' })}\n\n`))
          controller.close()
        }
      }
      
      // 初回チェック
      checkProgress()
    },
    
    cancel() {
      // クリーンアップ処理
    }
  })
  
  return new Response(stream, { headers })
}

function getStepFromStatus(status: string): number {
  const statusToStep: Record<string, number> = {
    'CREATED': 1,
    'COLLECTING': 4,
    'TOPICS_COLLECTED': 7,
    'GENERATING_CONCEPTS': 8,
    'CONCEPTS_GENERATED': 10,
    'DRAFTS_CREATED': 16
  }
  return statusToStep[status] || 1
}

function calculateProgress(status: string): number {
  const statusToProgress: Record<string, number> = {
    'CREATED': 6,
    'COLLECTING': 25,
    'TOPICS_COLLECTED': 44,
    'GENERATING_CONCEPTS': 50,
    'CONCEPTS_GENERATED': 63,
    'DRAFTS_CREATED': 100
  }
  return statusToProgress[status] || 0
}