import { NextResponse } from 'next/server'
import { editDraft } from '@/lib/twitter/enhanced-post-manager'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params
    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const result = await editDraft(draftId, content)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Draft edited successfully'
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to edit draft' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Edit draft API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}