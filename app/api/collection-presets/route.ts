import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: プリセット一覧を取得
export async function GET() {
  try {
    const presets = await prisma.collectionPreset.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    
    return NextResponse.json(presets)
  } catch (error) {
    console.error('Error fetching presets:', error)
    return NextResponse.json(
      { error: 'プリセットの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 新規プリセットを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, query, keywords, minLikes, minRetweets, category } = body
    
    if (!name || !keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '名前とキーワードは必須です' },
        { status: 400 }
      )
    }
    
    const preset = await prisma.collectionPreset.create({
      data: {
        name,
        description,
        settings: {
          query: query || keywords.join(' '),
          keywords,
          minLikes: minLikes || 100,
          minRetweets: minRetweets || 50,
          category: category || 'general',
          language: 'ja'
        }
      },
    })
    
    return NextResponse.json(preset)
  } catch (error) {
    console.error('Error creating preset:', error)
    return NextResponse.json(
      { error: 'プリセットの作成に失敗しました' },
      { status: 500 }
    )
  }
}