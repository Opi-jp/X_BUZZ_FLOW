import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Get draft
    const draft = await prisma.viralDraftV2.findUnique({
      where: { id }
    })
    
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    if (draft.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Draft is not scheduled' }, { status: 400 })
    }
    
    // Update draft status back to DRAFT and clear scheduled time
    const updatedDraft = await prisma.viralDraftV2.update({
      where: { id },
      data: {
        status: 'DRAFT',
        scheduledAt: null
      }
    })
    
    console.log(`[CANCEL SCHEDULE] Draft ${id} schedule cancelled`)
    
    return NextResponse.json({
      success: true,
      draft: updatedDraft
    })
  } catch (error) {
    console.error('Error cancelling schedule:', error)
    return NextResponse.json(
      { error: 'Failed to cancel schedule' },
      { status: 500 }
    )
  }
}