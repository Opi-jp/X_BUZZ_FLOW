import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { theme, platform, style } = body

    if (!theme || !platform || !style) {
      return NextResponse.json(
        { error: 'theme, platform, style are required' },
        { status: 400 }
      )
    }

    // セッションを作成
    const session = await prisma.viralSession.create({
      data: {
        theme,
        platform,
        style,
        status: 'CREATED'
      }
    })

    return NextResponse.json({ 
      success: true,
      session 
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const sessions = await prisma.viralSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { drafts: true }
        },
        drafts: {
          select: {
            id: true,
            content: true,
            createdAt: true
          }
        }
      }
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}