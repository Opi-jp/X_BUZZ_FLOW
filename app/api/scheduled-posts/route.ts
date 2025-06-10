import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 予定投稿一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = status ? { status: status as any } : {}

    const [posts, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        orderBy: { scheduledTime: 'asc' },
        take: limit,
        skip: offset,
        include: {
          refPost: true,
        },
      }),
      prisma.scheduledPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching scheduled posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    )
  }
}

// POST: 予定投稿作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      content,
      scheduledTime,
      postType,
      refPostId,
      templateType,
      aiGenerated,
      aiPrompt,
    } = body

    const post = await prisma.scheduledPost.create({
      data: {
        content,
        scheduledTime: new Date(scheduledTime),
        postType: postType || 'NEW',
        refPostId,
        templateType,
        aiGenerated: aiGenerated || false,
        aiPrompt,
      },
      include: {
        refPost: true,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating scheduled post:', error)
    return NextResponse.json(
      { error: 'Failed to create scheduled post' },
      { status: 500 }
    )
  }
}