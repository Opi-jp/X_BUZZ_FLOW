import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTwitterClient } from '@/lib/twitter'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST: スレッドをTwitterに投稿
export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { threadId } = body

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
          orderBy: { position: 'asc' },
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
    const client = getTwitterClient(session.accessToken)

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
            ...thread.metadata,
            tweetIds,
            postedBy: session.user?.email,
          },
        },
      })

      return NextResponse.json({
        success: true,
        tweetIds,
        threadUrl: `https://twitter.com/${session.user?.name}/status/${tweetIds[0]}`,
      })
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      
      // 部分的に投稿された場合はmetadataに保存
      if (tweetIds.length > 0) {
        await prisma.newsThread.update({
          where: { id: threadId },
          data: {
            status: 'failed',
            metadata: {
              ...thread.metadata,
              partialTweetIds: tweetIds,
              error: twitterError.message || 'Unknown error',
            },
          },
        })
      }

      return NextResponse.json(
        { 
          error: 'Twitter投稿エラー', 
          details: twitterError.message || 'Unknown error',
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