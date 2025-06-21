/**
 * 拡張投稿マネージャー（修正版）
 * ドラフト管理、Source Tree、投稿履歴を統合管理
 * スレッド投稿時の各ツイートIDを正しく記録
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

    // 元のthread_structureを保持
    const originalThreadStructure = draft.thread_structure

    // 2. 投稿するコンテンツを決定
    const shouldUseEdited = options?.useEditedContent ?? draft.is_edited
    let tweets: string[] = []
    let isThreadFormat = false
    
    // thread_structureがある場合は、スレッド形式として処理
    if (draft.thread_structure && typeof draft.thread_structure === 'object') {
      const threadData = draft.thread_structure as any
      
      if (threadData.type === 'thread' && Array.isArray(threadData.posts)) {
        // スレッド形式の場合は全ての投稿を使用
        tweets = [...threadData.posts]
        isThreadFormat = true
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

    // Source Treeの位置を記録
    let sourcePosition = -1
    
    // 3. Source Tree用の出典を準備
    if (options?.includeSource !== false && !isThreadFormat) {
      // スレッド形式でない場合のみSource Treeを追加
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
          sourcePosition = tweets.length - 1
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
      includesSource: sourcePosition >= 0,
      threadIds: threadResult.tweetIds,
      sourceId: sourcePosition >= 0 ? threadResult.tweetIds[sourcePosition] : undefined
    }

    // 6. DBを更新（トランザクション使用）
    await DBManager.transaction(async (tx) => {
      // 既存の投稿履歴を取得
      const currentHistory = (draft.post_history as unknown as PostHistoryEntry[]) || []
      
      // 投稿情報を構築
      const postedContent: any = {
        format: isThreadFormat ? 'thread' : (tweets.length > 1 ? 'with_source' : 'single'),
        tweetCount: tweets.length,
        mainTweetId: threadResult.threadId,
        threadIds: threadResult.tweetIds,
        url: threadResult.url,
        posts: tweets.map((content, index) => ({
          position: index,
          tweetId: threadResult.tweetIds[index],
          content: content,
          type: index === 0 ? 'main' : (index === sourcePosition ? 'source' : 'reply')
        }))
      }

      // ドラフトを更新
      const updateData: any = {
        status: 'POSTED',
        posted_at: new Date(),
        tweet_id: threadResult.threadId,
        source_tweets: postedContent,
        post_history: [...currentHistory, postHistoryEntry] as unknown as InputJsonValue,
        updated_at: new Date()
      }

      // スレッド形式の場合は、元のthread_structureに投稿IDを追加
      if (isThreadFormat && originalThreadStructure) {
        updateData.thread_structure = {
          ...originalThreadStructure,
          posted: true,
          postedIds: threadResult.tweetIds,
          postedAt: new Date()
        }
      }

      await tx.viral_drafts_v2.update({
        where: { id: draftId },
        data: updateData
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
            format: postedContent.format,
            tweetCount: postedContent.tweetCount,
            threadIds: threadResult.tweetIds,
            includesSource: sourcePosition >= 0,
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

// エクスポート用の静的クラス
export class EnhancedPostManager {
  static postDraftToTwitter = postDraftWithEnhancement
  static editDraft = editDraft
  static getDraftPostHistory = getDraftPostHistory
  static getEditedDrafts = getEditedDrafts
}