import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/prisma'

const prisma = new PrismaClient()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const draft = await prisma.viralDraftV2.findUnique({
      where: { id },
      include: {
        session: true
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
    console.error('Error fetching draft:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, hashtags, visualNote } = body
    
    // Validate input
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }
    
    // Get existing draft to verify it exists
    const existingDraft = await prisma.viralDraftV2.findUnique({
      where: { id }
    })
    
    if (!existingDraft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }
    
    // Don't allow editing of posted drafts
    if (existingDraft.status === 'POSTED') {
      return NextResponse.json(
        { error: 'Cannot edit posted draft' },
        { status: 400 }
      )
    }
    
    // Update draft
    const updatedDraft = await prisma.viralDraftV2.update({
      where: { id },
      data: {
        title,
        content,
        hashtags: hashtags || [],
        visualNote: visualNote || '',
        updatedAt: new Date()
      },
      include: {
        session: true
      }
    })
    
    console.log(`[DRAFT UPDATE] Draft ${id} updated successfully`)
    
    return NextResponse.json({ 
      success: true,
      draft: updatedDraft 
    })
  } catch (error) {
    console.error('Error updating draft:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}