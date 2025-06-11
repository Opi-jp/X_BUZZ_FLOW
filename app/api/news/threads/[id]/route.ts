import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: スレッド詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const thread = await prisma.newsThread.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            article: {
              include: {
                analysis: true,
              }
            },
          },
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

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Error fetching thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    )
  }
}

// PATCH: スレッドのステータス更新またはアイテムの内容更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, scheduledAt, items } = body

    // アイテムの内容更新の場合
    if (items && Array.isArray(items)) {
      // 各アイテムを更新
      await Promise.all(
        items.map(item => 
          prisma.newsThreadItem.update({
            where: { id: item.id },
            data: { content: item.content },
          })
        )
      )

      // ステータスも更新する場合
      if (status) {
        await prisma.newsThread.update({
          where: { id },
          data: { status },
        })
      }

      // 更新後のスレッドを返す
      const updatedThread = await prisma.newsThread.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              article: {
                include: {
                  analysis: true,
                }
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      })

      return NextResponse.json(updatedThread)
    }

    // ステータス更新の場合
    const thread = await prisma.newsThread.update({
      where: { id },
      data: {
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    })

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Error updating thread:', error)
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    )
  }
}

// DELETE: スレッド削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // まず関連するアイテムを削除
    await prisma.newsThreadItem.deleteMany({
      where: { threadId: id },
    })
    
    // その後スレッドを削除
    await prisma.newsThread.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting thread:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete thread',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any).code
      },
      { status: 500 }
    )
  }
}