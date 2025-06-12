import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const where: any = {}
    
    if (sessionId) {
      where.analysisId = sessionId
    }
    
    if (status) {
      where.status = status
    }
    
    if (category) {
      where.category = category
    }

    const drafts = await prisma.contentDraft.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json({
      success: true,
      drafts
    })

  } catch (error) {
    console.error('Failed to fetch drafts:', error)
    
    return NextResponse.json(
      { error: '下書き一覧の取得でエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const draft = await prisma.contentDraft.create({
      data: {
        analysisId: body.analysisId,
        conceptType: body.conceptType || 'general',
        category: body.category || 'その他',
        title: body.title,
        content: body.content,
        explanation: body.explanation || '',
        buzzFactors: body.buzzFactors || [],
        targetAudience: body.targetAudience || '',
        estimatedEngagement: body.estimatedEngagement || {},
        hashtags: body.hashtags || [],
        metadata: body.metadata || {}
      }
    })

    return NextResponse.json({
      success: true,
      draft
    })

  } catch (error) {
    console.error('Failed to create draft:', error)
    
    return NextResponse.json(
      { error: '下書き作成でエラーが発生しました' },
      { status: 500 }
    )
  }
}