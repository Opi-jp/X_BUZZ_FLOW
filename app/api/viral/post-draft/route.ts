import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { draftId, scheduledAt } = body

    if (!draftId) {
      return NextResponse.json(
        { error: '下書きIDが指定されていません' },
        { status: 400 }
      )
    }

    // 下書きを取得
    const draft = await prisma.contentDraft.findUnique({
      where: { id: draftId }
    })

    if (!draft) {
      return NextResponse.json(
        { error: '下書きが見つかりません' },
        { status: 404 }
      )
    }

    if (draft.status === 'posted') {
      return NextResponse.json(
        { error: 'この下書きは既に投稿済みです' },
        { status: 400 }
      )
    }

    // 投稿内容を決定（編集済みがあればそれを、なければ元の内容を使用）
    const content = draft.editedContent || draft.content
    
    // ハッシュタグを追加
    const hashtags = (draft.hashtags as string[] || []).join(' ')
    const fullContent = `${content}\n\n${hashtags}`.trim()

    // 文字数チェック（140文字制限）
    if (fullContent.length > 280) { // Twitter APIは280文字まで（日本語は140文字として計算）
      return NextResponse.json(
        { error: '投稿内容が文字数制限を超えています' },
        { status: 400 }
      )
    }

    // スケジュール投稿の場合
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt)
      
      // 過去の時間は不可
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'スケジュール時刻は未来の時間を指定してください' },
          { status: 400 }
        )
      }

      // メタデータに投稿予定時刻を保存
      await prisma.contentDraft.update({
        where: { id: draftId },
        data: {
          status: 'scheduled',
          metadata: {
            ...(draft.metadata as any || {}),
            scheduledAt: scheduledDate.toISOString(),
            scheduledContent: fullContent
          }
        }
      })

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledAt: scheduledDate.toISOString(),
        message: `${scheduledDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}に投稿予定です`
      })
    }

    // 即座に投稿
    const twitterClient = new TwitterApi(session.accessToken)
    
    try {
      const result = await twitterClient.v2.tweet({ text: fullContent })
      
      const tweetId = result.data.id
      const postUrl = `https://twitter.com/${session.user.username}/status/${tweetId}`

      // 下書きのステータスを更新
      await prisma.contentDraft.update({
        where: { id: draftId },
        data: {
          status: 'posted',
          metadata: {
            ...(draft.metadata as any || {}),
            postedAt: new Date().toISOString(),
            tweetId,
            postUrl,
            postedContent: fullContent
          }
        }
      })

      // パフォーマンストラッキングをスケジュール
      schedulePerformanceTracking(draftId, tweetId)

      return NextResponse.json({
        success: true,
        tweetId,
        url: postUrl,
        message: '投稿しました！'
      })

    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      
      const errorMessage = twitterError.data?.detail || 
                          twitterError.message || 
                          'Twitter投稿でエラーが発生しました'
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: twitterError.data
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Post draft error:', error)
    
    return NextResponse.json(
      { 
        error: '投稿処理でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// パフォーマンストラッキングをスケジュール
async function schedulePerformanceTracking(draftId: string, tweetId: string) {
  // 30分後、1時間後、24時間後にトラッキング
  const trackingTimes = [
    { delay: 30 * 60 * 1000, metric: '30m' },
    { delay: 60 * 60 * 1000, metric: '1h' },
    { delay: 24 * 60 * 60 * 1000, metric: '24h' }
  ]

  trackingTimes.forEach(({ delay, metric }) => {
    setTimeout(async () => {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/viral/performance/${draftId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tweetId, metric })
        })
      } catch (error) {
        console.error(`Performance tracking error (${metric}):`, error)
      }
    }, delay)
  })
}