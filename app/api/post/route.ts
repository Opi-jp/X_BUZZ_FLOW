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

    // 環境変数から認証情報を取得
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY!,
      appSecret: process.env.TWITTER_CONSUMER_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    })

    // モックモードのチェック
    if (process.env.USE_MOCK_POSTING === 'true') {
      const mockId = `mock_${Date.now()}`
      
      // 下書きステータス更新
      if (draftId) {
        await prisma.viralDraft.update({
          where: { id: draftId },
          data: {
            status: 'posted',
            tweetId: mockId,
            updatedAt: new Date()
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
      await prisma.viralDraft.update({
        where: { id: draftId },
        data: {
          status: 'posted',
          tweetId: tweet.data.id,
          updatedAt: new Date()
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
    if (error.code === 429) {
      errorMessage = 'Twitter API rate limit exceeded. Please try again later.'
    } else if (error.data?.detail) {
      errorMessage = error.data.detail
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: error.code || 500 }
    )
  }
}