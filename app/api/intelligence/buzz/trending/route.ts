import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // モックデータを返す（実際のテーブルがまだない場合）
    const mockBuzzPosts = [
      {
        id: '1',
        content: 'AIの進化が止まらない！ChatGPTの新機能でプログラミングがさらに簡単に。もう人間のエンジニアは不要になるのか？🤖 #AI #プログラミング',
        author: 'tech_influencer',
        likes: 1523,
        retweets: 342,
        impressions: 45000,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        content: 'リモートワーク3年目の本音。生産性は上がったけど、チームの一体感が薄れてきた。みんなはどう？ #リモートワーク #働き方改革',
        author: 'remote_worker',
        likes: 892,
        retweets: 156,
        impressions: 28000,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        content: '生成AIを使った副業で月50万円稼げるようになった話。やり方を無料で教えます👇 #AI副業 #生成AI',
        author: 'ai_entrepreneur',
        likes: 3421,
        retweets: 789,
        impressions: 98000,
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ]

    return NextResponse.json({ 
      posts: mockBuzzPosts.slice(0, limit) 
    })
  } catch (error) {
    console.error('Error fetching trending buzz posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buzz posts' },
      { status: 500 }
    )
  }
}