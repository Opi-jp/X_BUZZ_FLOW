import { NextRequest, NextResponse } from 'next/server'
import { claudeLog } from '@/lib/core/claude-logger'

/**
 * 統合Publishシステム - エントリーポイント
 * POST/スケジュールを同一概念として扱う統合API
 */

interface PublishRequest {
  draftId?: string
  draftIds?: string[]
  publishType: 'immediate' | 'scheduled'
  scheduledAt?: string
  options?: {
    addHashtags?: boolean
    optimizeTime?: boolean
    batchDelay?: number
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    claudeLog.flow(
      { module: 'api', operation: 'publish-entry', metadata: { requestId } },
      '📤 Unified Publish request started'
    )

    const body: PublishRequest = await request.json()
    const { draftId, draftIds, publishType, scheduledAt, options = {} } = body

    // 処理対象の下書きID配列を作成
    const targetDraftIds = draftId ? [draftId] : (draftIds || [])
    
    if (targetDraftIds.length === 0) {
      throw new Error('処理対象の下書きが指定されていません')
    }

    claudeLog.info(
      { module: 'api', operation: 'publish-validation', requestId },
      `✅ Publish validation passed`,
      { 
        targetCount: targetDraftIds.length, 
        publishType, 
        hasSchedule: !!scheduledAt 
      }
    )

    // 即時投稿 vs スケジュール投稿の分岐
    if (publishType === 'immediate') {
      // 即時投稿処理
      const publishResults = []
      
      for (const id of targetDraftIds) {
        try {
          // 下書きデータを取得
          const { prisma } = await import('@/lib/prisma')
          const draft = await prisma.viralDraftV2.findUnique({
            where: { id }
          })
          
          if (!draft) {
            publishResults.push({
              draftId: id,
              status: 'failed',
              error: '下書きが見つかりません'
            })
            continue
          }

          // ハッシュタグ付きテキストを構築
          const hashtags = draft.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')
          const tweetText = `${draft.content}\n\n${hashtags}`
          
          // 既存の投稿APIを呼び出し
          const postResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: tweetText,
              draftId: id 
            })
          })
          
          const postResult = await postResponse.json()
          
          if (postResponse.ok && postResult.success) {
            publishResults.push({
              draftId: id,
              status: 'published',
              tweetUrl: postResult.url,
              publishedAt: new Date().toISOString()
            })
          } else {
            publishResults.push({
              draftId: id,
              status: 'failed',
              error: postResult.error || '投稿に失敗しました'
            })
          }
        } catch (error) {
          publishResults.push({
            draftId: id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      claudeLog.success(
        { module: 'api', operation: 'immediate-publish', requestId },
        '🚀 Immediate publish completed',
        { successCount: publishResults.filter(r => r.status === 'published').length }
      )

      return NextResponse.json({
        success: true,
        publishType: 'immediate',
        results: publishResults,
        summary: {
          total: targetDraftIds.length,
          published: publishResults.filter(r => r.status === 'published').length,
          failed: publishResults.filter(r => r.status === 'failed').length
        }
      })

    } else if (publishType === 'scheduled') {
      // スケジュール投稿処理
      if (!scheduledAt) {
        throw new Error('スケジュール投稿には日時の指定が必要です')
      }

      const scheduleResults = []
      
      for (const id of targetDraftIds) {
        try {
          // 下書きデータを取得
          const { prisma } = await import('@/lib/prisma')
          const draft = await prisma.viralDraftV2.findUnique({
            where: { id }
          })
          
          if (!draft) {
            scheduleResults.push({
              draftId: id,
              status: 'failed',
              error: '下書きが見つかりません'
            })
            continue
          }

          // スケジュールレコードを直接作成（Prismaスキーマに合わせて調整）
          const scheduledPost = await prisma.scheduledPost.create({
            data: {
              content: draft.content,
              hashtags: draft.hashtags,
              scheduledTime: new Date(scheduledAt), // scheduledAt → scheduledTime
              status: 'SCHEDULED',
              draftId: id
            }
          })
          
          scheduleResults.push({
            draftId: id,
            status: 'scheduled',
            scheduledAt,
            scheduleId: scheduledPost.id
          })
        } catch (error) {
          scheduleResults.push({
            draftId: id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      claudeLog.success(
        { module: 'api', operation: 'scheduled-publish', requestId },
        '⏰ Schedule publish completed',
        { scheduledCount: scheduleResults.filter(r => r.status === 'scheduled').length }
      )

      return NextResponse.json({
        success: true,
        publishType: 'scheduled',
        results: scheduleResults,
        summary: {
          total: targetDraftIds.length,
          scheduled: scheduleResults.filter(r => r.status === 'scheduled').length,
          failed: scheduleResults.filter(r => r.status === 'failed').length
        }
      })
    }

    throw new Error(`Unsupported publish type: ${publishType}`)

  } catch (error) {
    claudeLog.error(
      { module: 'api', operation: 'publish-error', metadata: { requestId } },
      '💥 Publish request failed',
      error
    )

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'エラーが発生しました',
      requestId
    }, { status: 500 })
  }
}

export async function GET() {
  // Publish状況の取得
  return NextResponse.json({
    status: 'operational',
    features: {
      immediate: true,
      scheduled: true,
      batch: true,
      tracking: true
    },
    description: 'Unified Publish System - POST and Schedule as one concept'
  })
}