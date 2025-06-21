import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const [drafts, total] = await Promise.all([
      prisma.viral_drafts.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          session_id: true,
          title: true,
          content: true,
          hashtags: true,
          status: true,
          character_id: true,
          tweet_id: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.viral_drafts.count({ where })
    ])

    return NextResponse.json({
      drafts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}