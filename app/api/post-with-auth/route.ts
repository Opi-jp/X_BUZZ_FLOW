import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'

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

    // セッションから認証情報を取得
    const session = await getServerSession(authOptions)
    
    // モックモードまたは未認証の場合
    if (process.env.USE_MOCK_POSTING === 'true' || !session?.account?.access_token) {
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
        mock: true,
        message: session ? 'Mock mode' : 'Not authenticated - using mock'
      })
    }

    // ユーザーの認証情報でTwitterクライアントを作成
    const client = new TwitterApi(session.account.access_token)
    
    // 実際の投稿
    const tweet = await client.v2.tweet(text)
    
    const tweetUrl = `https://twitter.com/${session.user?.username || 'user'}/status/${tweet.data.id}`
    
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
      url: tweetUrl,
      createdAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Post error:', error)
    return NextResponse.json(
      { error: 'Failed to post' },
      { status: 500 }
    )
  }
}