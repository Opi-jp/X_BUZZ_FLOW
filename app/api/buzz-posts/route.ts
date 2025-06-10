import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: バズ投稿一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const theme = searchParams.get('theme')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = theme ? { theme } : {}

    const [posts, total] = await Promise.all([
      prisma.buzzPost.findMany({
        where,
        orderBy: { likesCount: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.buzzPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching buzz posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buzz posts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST: バズ投稿作成（Kaito APIから取得したデータを保存）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      postId,
      content,
      authorUsername,
      authorId,
      likesCount,
      retweetsCount,
      repliesCount,
      impressionsCount,
      postedAt,
      url,
      theme,
      language,
      mediaUrls,
      hashtags,
    } = body

    const post = await prisma.buzzPost.create({
      data: {
        postId,
        content,
        authorUsername,
        authorId,
        likesCount: likesCount || 0,
        retweetsCount: retweetsCount || 0,
        repliesCount: repliesCount || 0,
        impressionsCount: impressionsCount || 0,
        postedAt: new Date(postedAt),
        url,
        theme,
        language: language || 'ja',
        mediaUrls: mediaUrls || [],
        hashtags: hashtags || [],
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating buzz post:', error)
    return NextResponse.json(
      { error: 'Failed to create buzz post' },
      { status: 500 }
    )
  }
}