import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET: ウォッチリストユーザーのツイートを取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const watchlistUserId = searchParams.get('userId')

    const skip = (page - 1) * limit

    // ウォッチリストユーザーを取得
    const watchlistUsers = await prisma.watchlistUser.findMany({
      where: {
        userId: session.user.id,
        ...(watchlistUserId ? { id: watchlistUserId } : {})
      },
      select: { username: true }
    })

    if (watchlistUsers.length === 0) {
      return NextResponse.json({ tweets: [], total: 0 })
    }

    const usernames = watchlistUsers.map(u => u.username)

    // BuzzPostsからウォッチリストユーザーの投稿を取得
    const [tweets, total] = await Promise.all([
      prisma.buzzPost.findMany({
        where: {
          authorUsername: { in: usernames },
          // @リプライを除外
          NOT: {
            content: { startsWith: '@' }
          }
        },
        orderBy: { postedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.buzzPost.count({
        where: {
          authorUsername: { in: usernames },
          NOT: {
            content: { startsWith: '@' }
          }
        }
      })
    ])

    return NextResponse.json({
      tweets,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching watchlist tweets:', error)
    return NextResponse.json(
      { error: 'ツイートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: ウォッチリストユーザーの最新ツイートを収集
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { watchlistUserId } = body

    // ウォッチリストユーザーを取得
    const watchlistUser = await prisma.watchlistUser.findFirst({
      where: {
        id: watchlistUserId,
        userId: session.user.id
      }
    })

    if (!watchlistUser) {
      return NextResponse.json(
        { error: 'ウォッチリストユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // Kaito APIを使って最新ツイートを収集
    const collectResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `from:${watchlistUser.username}`,
        maxItems: 50,
        excludeReplies: true
      })
    })

    if (!collectResponse.ok) {
      throw new Error('ツイートの収集に失敗しました')
    }

    const result = await collectResponse.json()

    // 最終収集日時を更新
    await prisma.watchlistUser.update({
      where: { id: watchlistUserId },
      data: { lastChecked: new Date() }
    })

    return NextResponse.json({
      collected: result.collected,
      saved: result.saved,
      message: `@${watchlistUser.username}の最新ツイートを収集しました`
    })
  } catch (error) {
    console.error('Error collecting watchlist tweets:', error)
    return NextResponse.json(
      { error: 'ツイートの収集に失敗しました' },
      { status: 500 }
    )
  }
}