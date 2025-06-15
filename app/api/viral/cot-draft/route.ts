import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: 下書き一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const status = searchParams.get('status')

    const where: any = {}
    if (sessionId) where.sessionId = sessionId
    if (status) where.status = status

    const drafts = await prisma.cotDraft.findMany({
      where,
      include: {
        session: {
          select: {
            expertise: true,
            platform: true,
            style: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('[cot-draft GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}