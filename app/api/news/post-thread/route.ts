import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTwitterClient } from '@/lib/twitter'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// POST: スレッドをTwitterに投稿
export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)
    console.log('Session:', JSON.stringify(session, null, 2))
    console.log('Request headers:', request.headers.get('cookie'))
    
    const body = await request.json()
    const { threadId, userId } = body
    
    if (!session?.user && !userId) {
      console.error('No session found and no userId provided')
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得（userIdが指定されていれば優先、なければセッションから）
    const user = await prisma.user.findFirst({
      where: userId 
        ? { id: userId }
        : session?.user?.id 
        ? { id: session.user.id }
        : session?.user?.email 
        ? { email: session.user.email }
        : undefined,
    })
    
    console.log('User found:', user ? 'Yes' : 'No', user?.username)

    if (!user?.accessToken) {
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId is required' },
        { status: 400 }
      )
    }

    // スレッドを取得
    const thread = await prisma.newsThread.findUnique({
      where: { id: threadId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      )
    }

    if (thread.status === 'posted') {
      return NextResponse.json(
        { error: 'Thread already posted' },
        { status: 400 }
      )
    }

    // Twitter APIクライアント初期化
    console.log('Initializing Twitter client with token:', user.accessToken.substring(0, 20) + '...')
    const client = getTwitterClient(user.accessToken)

    // ツイートIDを保存する配列
    const tweetIds: string[] = []
    let lastTweetId: string | undefined = undefined

    try {
      // 各ツイートを順番に投稿
      for (const item of thread.items) {
        const tweetData: any = {
          text: item.content,
        }

        // 最初のツイート以外は返信として投稿
        if (lastTweetId) {
          tweetData.reply = {
            in_reply_to_tweet_id: lastTweetId,
          }
        }

        // ツイートを投稿
        const result = await client.v2.tweet(tweetData)
        
        if (result.data?.id) {
          tweetIds.push(result.data.id)
          lastTweetId = result.data.id

          // APIレート制限対策: 1秒待機
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          throw new Error('Failed to get tweet ID')
        }
      }

      // スレッドのステータスを更新
      await prisma.newsThread.update({
        where: { id: threadId },
        data: {
          status: 'posted',
          postedAt: new Date(),
          metadata: {
            ...(thread.metadata as object || {}),
            tweetIds,
            postedBy: user.email,
          },
        },
      })

      return NextResponse.json({
        success: true,
        tweetIds,
        threadUrl: `https://twitter.com/${user.username}/status/${tweetIds[0]}`,
      })
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      console.error('Error details:', {
        message: twitterError.message,
        code: twitterError.code,
        data: twitterError.data,
        errors: twitterError.errors,
        stack: twitterError.stack
      })
      
      // 部分的に投稿された場合はmetadataに保存
      if (tweetIds.length > 0) {
        await prisma.newsThread.update({
          where: { id: threadId },
          data: {
            status: 'failed',
            metadata: {
              ...(thread.metadata as object || {}),
              partialTweetIds: tweetIds,
              error: twitterError.message || 'Unknown error',
              errorDetails: {
                code: twitterError.code,
                data: twitterError.data,
                errors: twitterError.errors
              }
            },
          },
        })
      }

      const errorMessage = twitterError.data?.detail || twitterError.message || 'Unknown error'
      
      return NextResponse.json(
        { 
          error: 'Twitter投稿エラー', 
          details: errorMessage,
          twitterCode: twitterError.code,
          twitterData: twitterError.data,
          partialTweetIds: tweetIds,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error posting thread:', error)
    return NextResponse.json(
      { error: 'Failed to post thread', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}