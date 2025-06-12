import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params

    const draft = await prisma.contentDraft.findUnique({
      where: { id: draftId }
    })

    if (!draft) {
      return NextResponse.json(
        { error: '下書きが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      draft
    })

  } catch (error) {
    console.error('Failed to fetch draft:', error)
    
    return NextResponse.json(
      { error: '下書き取得でエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params
    const body = await request.json()

    const updateData: any = {}
    
    if (body.editedContent !== undefined) {
      updateData.editedContent = body.editedContent
      updateData.status = 'edited'
    }
    
    if (body.status) {
      updateData.status = body.status
    }
    
    if (body.editorNotes) {
      updateData.editorNotes = body.editorNotes
    }
    
    if (body.hashtags) {
      updateData.hashtags = body.hashtags
    }

    const draft = await prisma.contentDraft.update({
      where: { id: draftId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      draft
    })

  } catch (error) {
    console.error('Failed to update draft:', error)
    
    return NextResponse.json(
      { error: '下書き更新でエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params

    await prisma.contentDraft.delete({
      where: { id: draftId }
    })

    return NextResponse.json({
      success: true,
      message: '下書きを削除しました'
    })

  } catch (error) {
    console.error('Failed to delete draft:', error)
    
    return NextResponse.json(
      { error: '下書き削除でエラーが発生しました' },
      { status: 500 }
    )
  }
}