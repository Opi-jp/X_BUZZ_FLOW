import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// シンプルにDBから全ての下書きデータを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // DBから直接取得
    const drafts = await prisma.viralDraftV2.findMany({
      where: {
        ...(characterId ? { characterId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        session: {
          select: {
            theme: true,
            platform: true,
            style: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      total: drafts.length,
      drafts
    })

  } catch (error) {
    console.error('[Get Drafts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}