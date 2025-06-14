import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET: ウォッチリストユーザー一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const watchlistUsers = await prisma.watchlistUser.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: 'desc' },
      include: {
        _count: {
          select: { tweets: true }
        }
      }
    })

    return NextResponse.json(watchlistUsers)
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { error: 'ウォッチリストの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: ウォッチリストにユーザーを追加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { username, twitterId, displayName, profileImageUrl } = body

    if (!username) {
      return NextResponse.json(
        { error: 'ユーザー名は必須です' },
        { status: 400 }
      )
    }

    // 既存のウォッチリストユーザーをチェック
    const existing = await prisma.watchlistUser.findFirst({
      where: {
        userId: session.user.id,
        username: username.replace('@', '')
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'このユーザーは既にウォッチリストに追加されています' },
        { status: 400 }
      )
    }

    // ウォッチリストに追加
    const watchlistUser = await prisma.watchlistUser.create({
      data: {
        userId: session.user.id,
        username: username.replace('@', ''),
        twitterId: twitterId || '',
        displayName: displayName || username,
        profileImage: profileImageUrl || '',
      }
    })

    return NextResponse.json(watchlistUser)
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { error: 'ウォッチリストへの追加に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: ウォッチリストからユーザーを削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const watchlistUserId = searchParams.get('id')

    if (!watchlistUserId) {
      return NextResponse.json(
        { error: 'IDは必須です' },
        { status: 400 }
      )
    }

    // 削除権限の確認
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

    // 関連するツイートも削除
    await prisma.watchlistTweet.deleteMany({
      where: { watchlistUserId }
    })

    // ウォッチリストユーザーを削除
    await prisma.watchlistUser.delete({
      where: { id: watchlistUserId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { error: 'ウォッチリストからの削除に失敗しました' },
      { status: 500 }
    )
  }
}