import { NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { DBManager, ErrorManager } from '@/lib/core/unified-system-manager'
import { prisma } from '@/lib/prisma'
import { postDraftWithEnhancement } from '@/lib/twitter/enhanced-post-manager'
import { postSingleTweet } from '@/lib/twitter/thread-poster'

// 既存の/api/twitter/postの機能をシンプルに統合
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, draftId, includeSource = true, useEditedContent } = body

    // ドラフトIDがある場合は拡張投稿機能を使用
    if (draftId) {
      const result = await postDraftWithEnhancement(draftId, {
        includeSource,
        useEditedContent
      })

      if (result.success && result.threadResult) {
        return NextResponse.json({
          success: true,
          id: result.threadResult.threadId,
          url: result.threadResult.url,
          threadIds: result.threadResult.tweetIds,
          includesSource: result.threadResult.tweetIds.length > 1
        })
      } else {
        return NextResponse.json(
          { error: result.error || 'Failed to post draft' },
          { status: 500 }
        )
      }
    }

    // テキストのみの場合は従来の処理
    if (!text) {
      return NextResponse.json(
        { error: 'Text or draftId is required' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    console.log('Twitter API環境変数チェック:')
    console.log('  TWITTER_API_KEY:', !!process.env.TWITTER_API_KEY)
    console.log('  TWITTER_API_SECRET:', !!process.env.TWITTER_API_SECRET)
    console.log('  TWITTER_ACCESS_TOKEN:', !!process.env.TWITTER_ACCESS_TOKEN)
    console.log('  TWITTER_ACCESS_SECRET:', !!process.env.TWITTER_ACCESS_SECRET)
    
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
      console.error('Missing Twitter API credentials in environment variables')
      return NextResponse.json(
        { error: 'Twitter API configuration is incomplete. Please check environment variables.' },
        { status: 500 }
      )
    }

    // 環境変数から認証情報を取得
    console.log('TwitterApiクライアント作成...')
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    })
    console.log('TwitterApiクライアント作成完了')

    // モックモードのチェック
    if (process.env.USE_MOCK_POSTING === 'true') {
      const mockId = `mock_${Date.now()}`
      
      // 下書きステータス更新
      if (draftId) {
        await prisma.viral_drafts.update({
          where: { id: draftId },
          data: {
            status: 'POSTED',
            tweet_id: mockId,
            posted_at: new Date()
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        id: mockId,
        url: `https://twitter.com/mock/status/${mockId}`,
        mock: true
      })
    }

    // テキストのみの投稿（Source Tree無し）
    const result = await postSingleTweet(text, {
      mockMode: process.env.USE_MOCK_POSTING === 'true'
    })
    
    return NextResponse.json({
      success: true,
      id: result.id,
      url: result.url
    })
    
  } catch (error: any) {
    console.error('Twitter post error:', error)
    
    // エラーメッセージの改善
    let errorMessage = 'Failed to post to Twitter'
    let statusCode = 500
    
    if (error.code === 429) {
      errorMessage = 'Twitter API rate limit exceeded. Please try again later.'
      statusCode = 429
    } else if (error.code === 401) {
      errorMessage = 'Twitter authentication failed. Please check API credentials.'
      statusCode = 401
    } else if (error.code === 403) {
      errorMessage = 'Twitter API access forbidden. Please check permissions.'
      statusCode = 403
    } else if (error.data?.detail) {
      errorMessage = error.data.detail
    } else if (error.message) {
      errorMessage = `Twitter API error: ${error.message}`
    }
    
    // APIのレスポンス詳細をログに記録
    if (error.data) {
      console.error('Twitter API response:', JSON.stringify(error.data, null, 2))
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.data : undefined
      },
      { status: statusCode }
    )
  }
}