import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

const prisma = new PrismaClient()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { scheduledAt } = body
    
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Validate scheduled time
    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Invalid scheduled time' },
        { status: 400 }
      )
    }
    
    // Get draft
    const draft = await prisma.viralDraftV2.findUnique({
      where: { id }
    })
    
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    if (draft.status === 'POSTED') {
      return NextResponse.json({ error: 'Already posted' }, { status: 400 })
    }
    
    // Update draft with scheduled time
    const updatedDraft = await prisma.viralDraftV2.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: scheduledDate
      }
    })
    
    console.log(`[SCHEDULE] Draft ${id} scheduled for ${scheduledDate.toISOString()}`)
    
    return NextResponse.json({
      success: true,
      draft: updatedDraft,
      scheduledAt: scheduledDate.toISOString()
    })
  } catch (error) {
    console.error('Error scheduling draft:', error)
    return NextResponse.json(
      { error: 'Failed to schedule draft' },
      { status: 500 }
    )
  }
}