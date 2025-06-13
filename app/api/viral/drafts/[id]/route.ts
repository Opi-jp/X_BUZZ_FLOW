import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 個別の下書き取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        analysis: {
          select: {
            id: true,
            analysisType: true,
            metadata: true
          }
        }
      }
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
      { error: '下書きの取得でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCH: 下書きの更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 更新可能なフィールドのみを抽出
    const updateData: any = {}
    
    if (body.editedContent !== undefined) {
      updateData.editedContent = body.editedContent
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.hashtags !== undefined) {
      updateData.hashtags = body.hashtags
    }
    if (body.editorNotes !== undefined) {
      updateData.editorNotes = body.editorNotes
    }
    if (body.metadata !== undefined) {
      // 既存のmetadataとマージ
      const currentDraft = await prisma.contentDraft.findUnique({
        where: { id },
        select: { metadata: true }
      })
      updateData.metadata = {
        ...(currentDraft?.metadata as any || {}),
        ...body.metadata
      }
    }

    const draft = await prisma.contentDraft.update({
      where: { id },
      data: updateData,
      include: {
        analysis: {
          select: {
            id: true,
            analysisType: true,
            metadata: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      draft
    })

  } catch (error) {
    console.error('Failed to update draft:', error)
    
    return NextResponse.json(
      { error: '下書きの更新でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: 下書きの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 投稿済みの場合は削除不可
    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      select: { status: true }
    })

    if (!draft) {
      return NextResponse.json(
        { error: '下書きが見つかりません' },
        { status: 404 }
      )
    }

    if (draft.status === 'posted') {
      return NextResponse.json(
        { error: '投稿済みの下書きは削除できません' },
        { status: 400 }
      )
    }

    await prisma.contentDraft.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '下書きを削除しました'
    })

  } catch (error) {
    console.error('Failed to delete draft:', error)
    
    return NextResponse.json(
      { error: '下書きの削除でエラーが発生しました' },
      { status: 500 }
    )
  }
}