import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 特定の予定投稿取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const post = await prisma.scheduledPost.findUnique({
      where: { id },
      include: {
        refPost: true,
        analytics: {
          orderBy: { measuredAt: 'desc' },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching scheduled post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled post' },
      { status: 500 }
    )
  }
}

// PATCH: 予定投稿更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const {
      content,
      editedContent,
      scheduledTime,
      status,
      postType,
      templateType,
    } = body

    const updateData: any = {}
    if (content !== undefined) updateData.content = content
    if (editedContent !== undefined) updateData.editedContent = editedContent
    if (scheduledTime !== undefined) updateData.scheduledTime = new Date(scheduledTime)
    if (status !== undefined) updateData.status = status
    if (postType !== undefined) updateData.postType = postType
    if (templateType !== undefined) updateData.templateType = templateType

    const post = await prisma.scheduledPost.update({
      where: { id },
      data: updateData,
      include: {
        refPost: true,
      },
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error updating scheduled post:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled post' },
      { status: 500 }
    )
  }
}

// DELETE: 予定投稿削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.scheduledPost.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting scheduled post:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled post' },
      { status: 500 }
    )
  }
}