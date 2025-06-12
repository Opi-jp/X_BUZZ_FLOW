import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { postToTwitter } from '@/lib/twitter'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { draftId, scheduledTime, autoPost = true } = body

    if (!draftId) {
      return NextResponse.json(
        { error: '下書きIDが必要です' },
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

    // 最適な投稿時間を計算（指定がない場合）
    const postTime = scheduledTime ? new Date(scheduledTime) : calculateOptimalPostTime()

    // スケジュール投稿を作成
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId: user.id,
        draftId: draftId,
        content: draft.content,
        platform: draft.platform,
        scheduledAt: postTime,
        status: 'scheduled',
        metadata: {
          hashtags: draft.hashtags,
          topic: draft.topic,
          viralScore: (draft.metadata as any)?.viralScore,
          autoPost
        }
      }
    })

    // 即座に投稿する場合
    if (autoPost && postTime <= new Date()) {
      return executePost(scheduledPost.id)
    }

    return NextResponse.json({
      success: true,
      scheduledPost: {
        id: scheduledPost.id,
        scheduledAt: scheduledPost.scheduledAt,
        status: scheduledPost.status
      },
      message: `投稿を${postTime.toLocaleString('ja-JP')}にスケジュールしました`
    })

  } catch (error) {
    console.error('Scheduler error:', error)
    return NextResponse.json(
      { error: 'スケジュール設定に失敗しました' },
      { status: 500 }
    )
  }
}

// スケジュールされた投稿を取得
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'scheduled'
    const limit = parseInt(searchParams.get('limit') || '20')

    const posts = await prisma.scheduledPost.findMany({
      where: {
        userId: user.id,
        status: status as any
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            username: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length
    })

  } catch (error) {
    console.error('Get scheduled posts error:', error)
    return NextResponse.json(
      { error: '取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 最適な投稿時間を計算
function calculateOptimalPostTime(): Date {
  const now = new Date()
  const hour = now.getHours()
  
  // 日本時間での最適な投稿時間帯
  const optimalHours = [7, 12, 18, 21] // 朝、昼、夕方、夜
  
  // 次の最適時間を見つける
  let targetHour = optimalHours.find(h => h > hour)
  
  if (!targetHour) {
    // 今日の最適時間を過ぎている場合は翌日の朝
    targetHour = optimalHours[0]
    now.setDate(now.getDate() + 1)
  }
  
  now.setHours(targetHour, 0, 0, 0)
  
  return now
}

// 投稿を実行
async function executePost(scheduledPostId: string) {
  try {
    const post = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: { user: true }
    })

    if (!post) {
      throw new Error('投稿が見つかりません')
    }

    // Twitter APIで投稿
    const result = await postToTwitter({
      content: post.content,
      userId: post.userId,
      accessToken: post.user.accessToken
    })

    // ステータスを更新
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'posted',
        postedAt: new Date(),
        tweetId: result.data.id,
        metadata: {
          ...(post.metadata as any || {}),
          twitterResponse: result.data
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: '投稿が完了しました',
      tweetId: result.data.id,
      tweetUrl: `https://twitter.com/${post.user.username}/status/${result.data.id}`
    })

  } catch (error) {
    console.error('Execute post error:', error)
    
    // エラーステータスに更新
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'failed',
        metadata: {
          error: error.message,
          failedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json(
      { error: '投稿に失敗しました' },
      { status: 500 }
    )
  }
}