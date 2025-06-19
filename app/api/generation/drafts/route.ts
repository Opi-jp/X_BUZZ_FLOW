import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    // Build where clause based on query parameters
    const where: any = {}
    if (status) {
      where.status = status
    }
    
    const drafts = await prisma.viralDraftV2.findMany({
      where,
      orderBy: { 
        // For scheduled posts, order by scheduled time
        // For others, order by creation time
        ...(status === 'SCHEDULED' ? { scheduledAt: 'asc' } : { createdAt: 'desc' })
      },
      include: {
        session: {
          include: {
            contents: {
              include: {
                concept: true
              }
            }
          }
        }
      }
    })
    
    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}