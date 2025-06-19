import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, ValidationError } from '@/lib/api/error-handler'
import { SmartRTScheduler } from '@/lib/smart-rt-scheduler'
import { env } from '@/lib/config/env'

// RT予約API
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json()
  const {
    postId,
    originalContent,
    strategies,
    draftId,
    draftType,
    characterId,
    customComment
  } = body
  
  if (!postId || !originalContent || !strategies || strategies.length === 0) {
    throw new ValidationError('postId, originalContent, and strategies are required')
  }
  
  try {
    const scheduler = new SmartRTScheduler()
    
    // キャラクター情報を取得（必要な場合）
    let character = null
    if (characterId) {
      character = await prisma.characterProfile.findUnique({
        where: { id: characterId }
      })
    }
    
    // 複数のRT戦略を予約
    const scheduledRTs = await scheduler.scheduleMultipleRTs(
      postId,
      originalContent,
      strategies,
      draftId,
      draftType as 'viral' | 'cot',
      character || undefined
    )
    
    // アクティビティログ
    await prisma.sessionActivityLog.create({
      data: {
        sessionId: draftId || postId,
        sessionType: draftType?.toUpperCase() || 'SYSTEM',
        activityType: 'RT_SCHEDULED',
        details: {
          postId,
          strategies,
          rtCount: scheduledRTs.length,
          characterId
        }
      }
    })
    
    return {
      success: true,
      scheduledRTs: scheduledRTs.map(rt => ({
        id: rt.id,
        scheduledAt: rt.scheduledAt,
        strategy: rt.rtStrategy,
        hasComment: rt.addComment
      }))
    }
    
  } catch (error) {
    console.error('RT scheduling error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL']
})

// RT予約をキャンセル
export const DELETE = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const rtId = searchParams.get('id')
  
  if (!rtId) {
    throw new ValidationError('RT ID is required')
  }
  
  try {
    const rt = await prisma.scheduledRetweet.findUnique({
      where: { id: rtId }
    })
    
    if (!rt) {
      throw new ValidationError('RT not found')
    }
    
    if (rt.status !== 'SCHEDULED') {
      throw new ValidationError('Cannot cancel RT that is not scheduled')
    }
    
    // ステータスをキャンセルに更新
    await prisma.scheduledRetweet.update({
      where: { id: rtId },
      data: { status: 'CANCELLED' }
    })
    
    return {
      success: true,
      message: 'RT cancelled successfully'
    }
    
  } catch (error) {
    console.error('RT cancellation error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL']
})