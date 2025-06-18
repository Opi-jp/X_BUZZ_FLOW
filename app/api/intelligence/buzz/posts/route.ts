import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'postedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // ソート条件の構築
    let orderBy: any = {}
    switch (sortBy) {
      case 'likes':
        orderBy.likesCount = sortOrder
        break
      case 'retweets':
        orderBy.retweetsCount = sortOrder
        break
      case 'engagement':
        // エンゲージメント率でソート（計算フィールド）
        orderBy = [
          { likesCount: 'desc' },
          { retweetsCount: 'desc' }
        ]
        break
      default:
        orderBy.postedAt = sortOrder
    }

    // フィルター条件
    const where: any = {}
    if (category && category !== 'all') {
      where.theme = { contains: category, mode: 'insensitive' }
    }

    // データ取得
    const posts = await prisma.buzzPost.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        postId: true,
        content: true,
        authorUsername: true,
        authorId: true,
        authorFollowers: true,
        authorVerified: true,
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true,
        postedAt: true,
        url: true,
        theme: true,
        language: true,
        hashtags: true,
      }
    })

    // フロントエンド用のフォーマットに変換
    const formattedPosts = posts.map(post => ({
      id: post.id,
      postId: post.postId,
      content: post.content,
      author: post.authorUsername,
      authorHandle: `@${post.authorUsername}`,
      authorId: post.authorId,
      authorFollowers: post.authorFollowers,
      authorVerified: post.authorVerified,
      timestamp: post.postedAt.toISOString(),
      likes: post.likesCount,
      retweets: post.retweetsCount,
      replies: post.repliesCount,
      impressions: post.impressionsCount,
      trending: post.likesCount >= 5000, // 5000いいね以上をトレンド扱い
      category: post.theme || 'その他',
      url: post.url,
      language: post.language,
      hashtags: post.hashtags as string[] || [],
      // エンゲージメント率計算
      engagementRate: post.impressionsCount > 0 
        ? ((post.likesCount + post.retweetsCount + post.repliesCount) / post.impressionsCount * 100).toFixed(2)
        : '0.00'
    }))

    // 統計情報
    const stats = await prisma.buzzPost.aggregate({
      where,
      _count: { id: true },
      _avg: {
        likesCount: true,
        retweetsCount: true,
        impressionsCount: true,
      },
      _max: {
        likesCount: true,
        retweetsCount: true,
      }
    })

    // カテゴリ別統計
    const categoryStats = await prisma.buzzPost.groupBy({
      by: ['theme'],
      where,
      _count: { id: true },
      _avg: { likesCount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    // 今日のバズ投稿数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = await prisma.buzzPost.count({
      where: {
        ...where,
        postedAt: { gte: today }
      }
    })

    return NextResponse.json({
      posts: formattedPosts,
      stats: {
        total: stats._count.id,
        todayCount,
        avgLikes: Math.round(stats._avg.likesCount || 0),
        avgRetweets: Math.round(stats._avg.retweetsCount || 0),
        avgImpressions: Math.round(stats._avg.impressionsCount || 0),
        maxLikes: stats._max.likesCount || 0,
        maxRetweets: stats._max.retweetsCount || 0,
        topCategory: categoryStats[0]?.theme || 'AI',
        categories: categoryStats.map(cat => ({
          name: cat.theme,
          count: cat._count.id,
          avgLikes: Math.round(cat._avg.likesCount || 0)
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching buzz posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buzz posts' },
      { status: 500 }
    )
  }
}