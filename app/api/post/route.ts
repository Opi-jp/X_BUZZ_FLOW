import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// 既存の/api/twitter/postの機能をシンプルに統合
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, draftId } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
      console.error('Missing Twitter API credentials in environment variables')
      return NextResponse.json(
        { error: 'Twitter API configuration is incomplete. Please check environment variables.' },
        { status: 500 }
      )
    }

    // 環境変数から認証情報を取得
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    })

    // モックモードのチェック
    if (process.env.USE_MOCK_POSTING === 'true') {
      const mockId = `mock_${Date.now()}`
      
      // 下書きステータス更新
      if (draftId) {
        await prisma.viralDraftV2.update({
          where: { id: draftId },
          data: {
            status: 'POSTED',
            tweetId: mockId,
            postedAt: new Date()
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

    // 実際の投稿
    const tweet = await client.v2.tweet(text)
    
    const tweetUrl = `https://twitter.com/${tweet.data.author_id || 'user'}/status/${tweet.data.id}`
    
    // 下書きステータス更新
    if (draftId) {
      await prisma.viralDraftV2.update({
        where: { id: draftId },
        data: {
          status: 'POSTED',
          tweetId: tweet.data.id,
          postedAt: new Date()
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      id: tweet.data.id,
      url: tweetUrl
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