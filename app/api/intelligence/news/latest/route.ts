import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // モックデータを返す（実際のテーブルがまだない場合）
    const mockNews = [
      {
        id: '1',
        title: 'OpenAI、新しいAIモデル「GPT-5」を発表',
        source: 'TechCrunch',
        url: 'https://example.com/news/1',
        publishedAt: new Date().toISOString(),
        category: 'AI'
      },
      {
        id: '2',
        title: 'リモートワーク導入企業が過去最高に',
        source: '日経新聞',
        url: 'https://example.com/news/2',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        category: '働き方'
      },
      {
        id: '3',
        title: 'AIエージェントが変える未来の仕事',
        source: 'Forbes',
        url: 'https://example.com/news/3',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        category: 'AI'
      }
    ]

    return NextResponse.json({ 
      items: mockNews.slice(0, limit) 
    })
  } catch (error) {
    console.error('Error fetching latest news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}