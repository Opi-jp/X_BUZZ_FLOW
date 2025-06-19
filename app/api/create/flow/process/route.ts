import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'

/**
 * Create Module - Flow Process API
 * 
 * 責務: セッションの現在の状態に基づいて次のステップを実行
 * 
 * フロー: Perplexity(COLLECTING) → GPT(GENERATING) → Claude(CONTENTS_GENERATING) → Draft(COMPLETED)
 */

const ProcessFlowSchema = z.object({
  sessionId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { sessionId } = ProcessFlowSchema.parse(body)
    
    // セッションを取得
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      return errorResponse(new Error('Session not found'), 404)
    }
    
    // 現在のステータスに基づいて次のアクションを決定
    let nextAction: string
    let nextEndpoint: string
    
    switch (session.status) {
      case 'CREATED':
        nextAction = 'Collecting topics with Perplexity'
        nextEndpoint = `/api/generation/content/sessions/${sessionId}/collect`
        break
        
      case 'TOPICS_COLLECTED':
        nextAction = 'Generating concepts with GPT'
        nextEndpoint = `/api/generation/content/sessions/${sessionId}/generate-concepts`
        break
        
      case 'CONCEPTS_GENERATED':
        nextAction = 'Generating content with Claude'
        nextEndpoint = `/api/generation/content/sessions/${sessionId}/generate`
        break
        
      case 'CONTENTS_GENERATED':
        nextAction = 'Creating drafts'
        nextEndpoint = `/api/generation/drafts`
        break
        
      case 'COMPLETED':
        return successResponse({
          sessionId,
          status: session.status,
          message: 'Flow already completed',
          drafts: await prisma.viralDraftV2.count({
            where: { sessionId }
          })
        })
        
      default:
        return errorResponse(new Error(`Unknown status: ${session.status}`), 400)
    }
    
    // 次のステップを実行
    console.log(`[Flow Process] Executing: ${nextAction}`)
    
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${nextEndpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // セッションクッキーを転送
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({})
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      console.error(`[Flow Process] API call failed:`, error)
      return errorResponse(new Error(`Failed to execute ${nextAction}`), 500)
    }
    
    const result = await response.json()
    
    // 更新されたセッション情報を取得
    const updatedSession = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { drafts: true }
        }
      }
    })
    
    return successResponse({
      sessionId,
      previousStatus: session.status,
      currentStatus: updatedSession?.status,
      action: nextAction,
      result: result,
      progress: getProgress(updatedSession?.status || ''),
      draftsCount: updatedSession?._count.drafts || 0
    })
    
  } catch (error) {
    return errorResponse(error)
  }
}

// 進捗率を計算
function getProgress(status: string): number {
  const progressMap: Record<string, number> = {
    'CREATED': 0,
    'COLLECTING': 10,
    'TOPICS_COLLECTED': 25,
    'GENERATING': 40,
    'CONCEPTS_GENERATED': 60,
    'CONTENTS_GENERATING': 75,
    'CONTENTS_GENERATED': 90,
    'COMPLETED': 100,
    'ERROR': 0
  }
  return progressMap[status] || 0
}

// セッションの状態を取得
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return errorResponse(new Error('SessionId is required'), 400)
    }
    
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      include: {
        drafts: {
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true
          }
        },
        _count: {
          select: { drafts: true }
        }
      }
    })
    
    if (!session) {
      return errorResponse(new Error('Session not found'), 404)
    }
    
    return successResponse({
      session: {
        id: session.id,
        theme: session.theme,
        status: session.status,
        progress: getProgress(session.status),
        createdAt: session.createdAt,
        platform: session.platform,
        style: session.style
      },
      drafts: session.drafts,
      stats: {
        draftsCount: session._count.drafts,
        isComplete: session.status === 'COMPLETED',
        canProcess: !['COMPLETED', 'ERROR'].includes(session.status)
      }
    })
    
  } catch (error) {
    return errorResponse(error)
  }
}