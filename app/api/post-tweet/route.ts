import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { postTweet } from '@/lib/twitter'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { scheduledPostId } = body

    // 予定投稿を取得
    const scheduledPost = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: { refPost: true },
    })

    if (!scheduledPost) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 })
    }

    // 投稿内容を決定
    const content = scheduledPost.editedContent || scheduledPost.content

    // Twitterに投稿
    const result = await postTweet(user.id, content)

    // 投稿結果を保存
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postResult: result.data,
      },
    })

    return NextResponse.json({
      success: true,
      tweetId: result.data.id,
      url: `https://twitter.com/${user.username}/status/${result.data.id}`,
    })
  } catch (error) {
    console.error('Error posting tweet:', error)
    return NextResponse.json(
      { error: 'Failed to post tweet' },
      { status: 500 }
    )
  }
}