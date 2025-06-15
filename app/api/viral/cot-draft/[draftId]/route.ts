import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: 特定の下書きを取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  try {
    const params = await context.params
    const draft = await prisma.cotDraft.findUnique({
      where: { id: params.draftId },
      include: {
        session: {
          select: {
            expertise: true,
            platform: true,
            style: true
          }
        },
        performance: true
      }
    })

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('[cot-draft GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    )
  }
}

// PUT: 下書きを更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      title,
      hook,
      angle,
      editedContent,
      hashtags,
      visualGuide,
      timing,
      scheduledAt
    } = body

    const updateData: any = {
      status: 'EDITED',
      updatedAt: new Date()
    }

    if (title !== undefined) updateData.title = title
    if (hook !== undefined) updateData.hook = hook
    if (angle !== undefined) updateData.angle = angle
    if (editedContent !== undefined) updateData.editedContent = editedContent
    if (hashtags !== undefined) updateData.hashtags = hashtags
    if (visualGuide !== undefined) updateData.visualGuide = visualGuide
    if (timing !== undefined) updateData.timing = timing
    
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
      if (scheduledAt) {
        updateData.status = 'SCHEDULED'
      }
    }

    const draft = await prisma.cotDraft.update({
      where: { id: params.draftId },
      data: updateData,
      include: {
        session: {
          select: {
            expertise: true,
            platform: true,
            style: true
          }
        }
      }
    })

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('[cot-draft PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}

// DELETE: 下書きを削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  try {
    const params = await context.params
    await prisma.cotDraft.delete({
      where: { id: params.draftId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[cot-draft DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}

// POST: Twitterに投稿
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { action } = body

    if (action !== 'post') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // 下書きを取得
    const draft = await prisma.cotDraft.findUnique({
      where: { id: params.draftId },
      include: {
        performance: true
      }
    })

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    if (draft.status === 'POSTED') {
      return NextResponse.json(
        { error: 'Already posted' },
        { status: 400 }
      )
    }

    // 投稿内容を準備
    const content = draft.editedContent || draft.content || ''
    const hashtagText = draft.hashtags.map(tag => `#${tag}`).join(' ')
    const fullContent = content + (hashtagText ? `\n\n${hashtagText}` : '')

    // Twitter投稿APIを呼び出す
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const postResponse = await fetch(`${baseUrl}/api/twitter/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: fullContent })
    })

    if (!postResponse.ok) {
      const error = await postResponse.json()
      throw new Error(error.message || 'Failed to post to Twitter')
    }

    const postResult = await postResponse.json()

    // 下書きのステータスを更新
    await prisma.cotDraft.update({
      where: { id: params.draftId },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postId: postResult.data?.id || postResult.id
      }
    })

    // パフォーマンストラッキング用のレコードを作成
    if (!draft.performance) {
      await prisma.cotDraftPerformance.create({
        data: {
          draftId: params.draftId
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      postId: postResult.data?.id || postResult.id,
      message: 'Successfully posted to Twitter'
    })
  } catch (error) {
    console.error('[cot-draft POST] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post' },
      { status: 500 }
    )
  }
}