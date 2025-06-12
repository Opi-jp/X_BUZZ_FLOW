import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// 直接DBからユーザーを取得してツイートする
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, userId } = body

    // セッションチェックをスキップして、直接userIdを使用
    if (!userId) {
      // セッションから試す
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json(
          { error: 'ユーザーIDまたはセッションが必要です' },
          { status: 401 }
        )
      }
    }

    // ユーザーを直接取得
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : undefined,
      orderBy: { createdAt: 'desc' }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    if (!user.accessToken) {
      return NextResponse.json(
        { error: 'アクセストークンがありません' },
        { status: 401 }
      )
    }

    console.log('Posting tweet for user:', user.username)
    console.log('Content:', content || 'テスト投稿')

    // Twitter API v2クライアントを作成
    const client = new TwitterApi(user.accessToken)

    try {
      // ツイートを投稿
      const result = await client.v2.tweet(content || `テスト投稿 from BuzzFlow at ${new Date().toLocaleString('ja-JP')}`)
      
      console.log('Tweet posted successfully:', result.data)

      return NextResponse.json({
        success: true,
        tweetId: result.data.id,
        tweetUrl: `https://twitter.com/${user.username}/status/${result.data.id}`,
        data: result.data
      })
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      
      // エラーの詳細を返す
      return NextResponse.json({
        error: 'Twitter API エラー',
        message: twitterError.message,
        code: twitterError.code,
        data: twitterError.data,
        errors: twitterError.errors
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in twitter/post:', error)
    return NextResponse.json({
      error: 'ツイート投稿に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}