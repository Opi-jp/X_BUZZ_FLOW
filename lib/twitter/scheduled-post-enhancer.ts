/**
 * スケジュール投稿の拡張機能
 * Source Tree対応のスケジュール投稿を管理
 */

import { prisma } from '@/lib/prisma'
import { DBManager, ErrorManager, IDGenerator, EntityType } from '@/lib/core/unified-system-manager'
import { formatSourceTweetFromSession } from './source-formatter'

export interface ScheduledPostWithSource {
  id: string
  draftId: string
  mainContent: string
  sourceContent?: string
  scheduledAt: Date
  includeSource: boolean
}

/**
 * ドラフトからスケジュール投稿を作成（Source Tree対応）
 */
export async function createScheduledPostWithSource(
  draftId: string,
  scheduledAt: Date,
  options?: {
    includeSource?: boolean
    useEditedContent?: boolean
  }
): Promise<{
  success: boolean
  scheduledPostId?: string
  error?: string
}> {
  try {
    // ドラフトを取得
    const draft = await DBManager.findUnique('viral_drafts', {
      where: { id: draftId },
      include: {
        viral_sessions: true
      }
    })

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`)
    }

    // 投稿するコンテンツを決定
    const shouldUseEdited = options?.useEditedContent ?? draft.is_edited
    const contentToPost = shouldUseEdited && draft.edited_content 
      ? draft.edited_content 
      : draft.content

    // Source Treeコンテンツを準備
    let sourceContent: string | undefined
    
    if (options?.includeSource !== false && draft.viral_sessions?.topics) {
      const formattedSource = await formatSourceTweetFromSession(draft.session_id)
      if (formattedSource) {
        sourceContent = Array.isArray(formattedSource) ? formattedSource.join('\n') : formattedSource
      }
    }

    // トランザクションでスケジュール投稿を作成
    const result = await DBManager.transaction(async (tx) => {
      // スケジュール投稿を作成
      const scheduledPost = await tx.scheduled_posts.create({
        data: {
          id: IDGenerator.generate(EntityType.SCHEDULED_POST),
          content: contentToPost,
          scheduled_time: scheduledAt,
          status: 'SCHEDULED',
          post_type: 'NEW',
          ai_generated: true,
          ai_prompt: JSON.stringify({
            draftId,
            sessionId: draft.session_id,
            includeSource: !!sourceContent,
            contentUsed: shouldUseEdited ? 'edited' : 'original',
            sourceContent
          }),
          updated_at: new Date()
        }
      })

      // ドラフトのステータスを更新
      await tx.viral_drafts.update({
        where: { id: draftId },
        data: {
          status: 'SCHEDULED',
          scheduled_at: scheduledAt,
          thread_structure: sourceContent ? {
            type: 'scheduled_with_source',
            sourceIncluded: true,
            scheduledPostId: scheduledPost.id
          } : {
            type: 'scheduled_single',
            sourceIncluded: false,
            scheduledPostId: scheduledPost.id
          }
        }
      })

      return scheduledPost
    })

    return {
      success: true,
      scheduledPostId: result.id
    }

  } catch (error) {
    console.error('Create scheduled post error:', error)
    
    const errorId = await ErrorManager.logError(error, {
      module: 'twitter',
      operation: 'create-scheduled-post',
      metadata: { draftId, scheduledAt, options }
    })

    return {
      success: false,
      error: ErrorManager.getUserMessage(error, 'ja')
    }
  }
}

/**
 * スケジュール投稿を実行（Source Tree対応）
 */
export async function executeScheduledPostWithSource(
  scheduledPostId: string
): Promise<{
  success: boolean
  tweetId?: string
  threadIds?: string[]
  error?: string
}> {
  try {
    const scheduledPost = await DBManager.findUnique('scheduled_posts', {
      where: { id: scheduledPostId }
    })

    if (!scheduledPost) {
      throw new Error(`Scheduled post not found: ${scheduledPostId}`)
    }

    // AI生成プロンプトからSource Tree情報を取得
    const promptData = scheduledPost.ai_prompt 
      ? JSON.parse(scheduledPost.ai_prompt as string)
      : {}

    // 投稿内容を準備
    const tweets: string[] = [scheduledPost.edited_content || scheduledPost.content]
    
    if (promptData.includeSource && promptData.sourceContent) {
      tweets.push(promptData.sourceContent)
    }

    // postThreadを使用して投稿
    const { postThread } = await import('./thread-poster')
    const threadResult = await postThread(tweets)

    // トランザクションで更新
    await DBManager.transaction(async (tx) => {
      // スケジュール投稿を更新
      await tx.scheduled_posts.update({
        where: { id: scheduledPostId },
        data: {
          status: 'POSTED',
          posted_at: new Date(),
          post_result: {
            threadId: threadResult.threadId,
            threadIds: threadResult.tweetIds,
            url: threadResult.url,
            includesSource: tweets.length > 1
          }
        }
      })

      // 関連するドラフトを更新
      if (promptData.draftId) {
        const currentDraft = await tx.viral_drafts.findUnique({
          where: { id: promptData.draftId },
          select: { post_history: true }
        })

        const postHistory = (currentDraft?.post_history as any[] || [])
        postHistory.push({
          postedAt: new Date(),
          tweetId: threadResult.threadId,
          contentUsed: promptData.contentUsed || 'original',
          includesSource: tweets.length > 1,
          threadIds: threadResult.tweetIds,
          sourceId: tweets.length > 1 ? threadResult.tweetIds[1] : undefined,
          scheduledPostId
        })

        await tx.viral_drafts.update({
          where: { id: promptData.draftId },
          data: {
            status: 'POSTED',
            posted_at: new Date(),
            tweet_id: threadResult.threadId,
            source_tweets: {
              mainTweetId: threadResult.threadId,
              sourceTweetId: tweets.length > 1 ? threadResult.tweetIds[1] : undefined,
              threadIds: threadResult.tweetIds,
              url: threadResult.url
            },
            post_history: postHistory
          }
        })
      }
    })

    return {
      success: true,
      tweetId: threadResult.threadId,
      threadIds: threadResult.tweetIds
    }

  } catch (error) {
    console.error('Execute scheduled post error:', error)
    
    const errorId = await ErrorManager.logError(error, {
      module: 'twitter',
      operation: 'execute-scheduled-post',
      metadata: { scheduledPostId }
    })

    return {
      success: false,
      error: ErrorManager.getUserMessage(error, 'ja')
    }
  }
}