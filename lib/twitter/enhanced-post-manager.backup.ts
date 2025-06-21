/**
 * 拡張投稿マネージャー
 * ドラフト管理、Source Tree、投稿履歴を統合管理
 */

import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'
import { DBManager, ErrorManager } from '@/lib/core/unified-system-manager'
import { postThread, ThreadResult } from './thread-poster'
import { formatSourceTweetFromSession } from './source-formatter'
import { InputJsonValue } from '@prisma/client/runtime/library'

export interface EnhancedPostOptions {
  draftId: string
  includeSource?: boolean
  useEditedContent?: boolean
  scheduledAt?: Date
}

export interface PostHistoryEntry {
  postedAt: Date
  tweetId: string
  contentUsed: 'original' | 'edited'
  includesSource: boolean
  threadIds?: string[]
  sourceId?: string
}

/**
 * ドラフトから投稿（Source Tree対応）
 */
export async function postDraftWithEnhancement(
  draftId: string,
  options?: Partial<EnhancedPostOptions>
): Promise<{
  success: boolean
  threadResult?: ThreadResult
  error?: string
}> {
  try {
    // 1. ドラフトを取得（セッション情報も含む）
    const draftResult = await DBManager.findUnique('viral_drafts_v2', {
      where: { id: draftId },
      include: {
        viral_sessions: true
      }
    })
    
    const draft = draftResult as any

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`)
    }

    // 2. 投稿するコンテンツを決定
    const shouldUseEdited = options?.useEditedContent ?? draft.is_edited
    let tweets: string[] = []
    
    // thread_structureがある場合は、スレッド形式として処理
    if (draft.thread_structure && typeof draft.thread_structure === 'object') {
      const threadData = draft.thread_structure as any
      
      if (threadData.type === 'thread' && Array.isArray(threadData.posts)) {
        // スレッド形式の場合は全ての投稿を使用
        tweets = [...threadData.posts]
        console.log(`📝 スレッド形式: ${tweets.length}件の投稿`)
      } else {
        // スレッド構造があるが期待した形式でない場合
        const contentToPost = shouldUseEdited && draft.edited_content 
          ? draft.edited_content 
          : draft.content
        tweets = [contentToPost]
      }
    } else {
      // thread_structureがない場合は単一投稿
      const contentToPost = shouldUseEdited && draft.edited_content 
        ? draft.edited_content 
        : draft.content
      tweets = [contentToPost]
    }

    // 3. Source Tree用の出典を準備
    
    if (options?.includeSource !== false) {
      // セッションからPerplexityトピックを取得して出典を作成
      console.log('Source Tree確認:', {
        hasSession: !!draft.viral_sessions,
        hasTopics: !!draft.viral_sessions?.topics,
        topicsType: typeof draft.viral_sessions?.topics
      })
      
      if (draft.viral_sessions?.topics) {
        const sourceInfo = await formatSourceTweetFromSession(draft.session_id)
        console.log('Source情報:', sourceInfo ? '生成成功' : '生成失敗')
        
        if (sourceInfo) {
          tweets.push(sourceInfo)
        }
      }
    }

    // 4. スレッドとして投稿
    const threadResult = await postThread(tweets, {
      mockMode: process.env.USE_MOCK_POSTING === 'true'
    })

    // 5. 投稿履歴を作成
    const postHistoryEntry: PostHistoryEntry = {
      postedAt: new Date(),
      tweetId: threadResult.threadId,
      contentUsed: shouldUseEdited ? 'edited' : 'original',
      includesSource: tweets.length > 1,
      threadIds: threadResult.tweetIds,
      sourceId: tweets.length > 1 ? threadResult.tweetIds[1] : undefined
    }

    // 6. DBを更新（トランザクション使用）
    await DBManager.transaction(async (tx) => {
      // 既存の投稿履歴を取得
      const currentHistory = (draft.post_history as unknown as PostHistoryEntry[]) || []
      
      // ドラフトを更新
      await tx.viral_drafts_v2.update({
        where: { id: draftId },
        data: {
          status: 'POSTED',
          posted_at: new Date(),
          tweet_id: threadResult.threadId,
          source_tweets: {
            mainTweetId: threadResult.threadId,
            sourceTweetId: postHistoryEntry.sourceId,
            threadIds: threadResult.tweetIds,
            url: threadResult.url
          },
          thread_structure: {
            type: tweets.length > 1 ? 'with_source' : 'single',
            count: tweets.length,
            structure: tweets.map((_, index) => ({
              position: index,
              type: index === 0 ? 'main' : 'source'
            }))
          },
          post_history: [...currentHistory, postHistoryEntry] as unknown as InputJsonValue,
          updated_at: new Date()
        }
      })

      // セッションアクティビティログを記録
      await tx.session_activity_logs.create({
        data: {
          session_id: draft.session_id,
          session_type: 'viral',
          activity_type: 'draft_posted',
          details: {
            draftId,
            tweetId: threadResult.threadId,
            includesSource: tweets.length > 1,
            contentUsed: postHistoryEntry.contentUsed
          }
        }
      })
    })

    return {
      success: true,
      threadResult
    }

  } catch (error) {
    console.error('Enhanced post error:', error)
    
    // エラーを記録
    const errorId = await ErrorManager.logError(error, {
      module: 'twitter',
      operation: 'enhanced-post',
      metadata: { draftId, options }
    })

    return {
      success: false,
      error: ErrorManager.getUserMessage(error, 'ja')
    }
  }
}

/**
 * ドラフトを編集
 */
export async function editDraft(
  draftId: string,
  editedContent: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await DBManager.update('viral_drafts_v2', {
      where: { id: draftId },
      data: {
        edited_content: editedContent,
        is_edited: true,
        edited_at: new Date(),
        updated_at: new Date()
      }
    })

    return { success: true }

  } catch (error) {
    console.error('Edit draft error:', error)
    
    const errorId = await ErrorManager.logError(error, {
      module: 'twitter',
      operation: 'edit-draft',
      metadata: { draftId }
    })

    return {
      success: false,
      error: ErrorManager.getUserMessage(error, 'ja')
    }
  }
}

/**
 * ドラフトの投稿履歴を取得
 */
export async function getDraftPostHistory(
  draftId: string
): Promise<PostHistoryEntry[]> {
  const draft = await DBManager.findUnique('viral_drafts_v2', {
    where: { id: draftId },
    select: { post_history: true }
  })

  return (draft?.post_history as unknown as PostHistoryEntry[]) || []
}

/**
 * 編集済みドラフトの一覧を取得
 */
export async function getEditedDrafts(
  sessionId?: string
): Promise<any[]> {
  const where: any = {
    is_edited: true,
    status: 'DRAFT'
  }

  if (sessionId) {
    where.session_id = sessionId
  }

  return await DBManager.findMany('viral_drafts_v2', {
    where,
    orderBy: { edited_at: 'desc' },
    include: {
      viral_sessions: {
        select: {
          theme: true,
          platform: true,
          style: true
        }
      }
    }
  })
}