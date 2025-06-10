import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: ニュースソース一覧取得
export async function GET(request: NextRequest) {
  try {
    const sources = await prisma.newsSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    })
    
    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching news sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news sources' },
      { status: 500 }
    )
  }
}

// POST: ニュースソース追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, type, category } = body

    const source = await prisma.newsSource.create({
      data: {
        name,
        url,
        type: type || 'RSS',
        category: category || 'AI',
      }
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error creating news source:', error)
    return NextResponse.json(
      { error: 'Failed to create news source' },
      { status: 500 }
    )
  }
}