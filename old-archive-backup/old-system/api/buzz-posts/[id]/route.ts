import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 特定のバズ投稿取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const post = await prisma.buzzPost.findUnique({
      where: { id },
      include: {
        scheduledPosts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching buzz post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buzz post' },
      { status: 500 }
    )
  }
}

// DELETE: バズ投稿削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.buzzPost.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting buzz post:', error)
    return NextResponse.json(
      { error: 'Failed to delete buzz post' },
      { status: 500 }
    )
  }
}