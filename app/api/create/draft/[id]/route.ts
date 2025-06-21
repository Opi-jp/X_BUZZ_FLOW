import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// 下書き詳細取得
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    const draft = await prisma.viral_drafts.findUnique({
      where: { id }
    })

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(draft)
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    )
  }
}

// 下書き編集
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, metadata } = body

    const draft = await prisma.viral_drafts.update({
      where: { id },
      data: {
        content,
        updated_at: new Date()
      }
    })

    return NextResponse.json(draft)
  } catch (error) {
    console.error('Error updating draft:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}

// 下書き削除
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    await prisma.viral_drafts.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting draft:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}