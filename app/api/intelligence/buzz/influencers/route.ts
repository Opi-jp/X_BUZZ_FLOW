import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // クエリパラメータ
  const category = searchParams.get('category') || 'all' // all, ai, work, meme
  const period = searchParams.get('period') || '7d' // 1d, 7d, 30d, all
  const sortBy = searchParams.get('sortBy') || 'engagement' // engagement, followers, posts, viral
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const useCache = searchParams.get('useCache') !== 'false' // デフォルトはキャッシュ使用
  const excludeInfoProduct = searchParams.get('excludeInfo') !== 'false' // デフォルトは情報商材除外
  
  try {
    // キャッシュされたデータを使用する場合
    if (useCache) {
      const cachedInfluencers = await prisma.buzzInfluencer.findMany({
        where: category !== 'all' ? { primaryCategory: category } : {},
        orderBy: sortBy === 'viral' ? { viralScore: 'desc' } :
                 sortBy === 'engagement' ? { engagementRate: 'desc' } :
                 sortBy === 'followers' ? { followers: 'desc' } :
                 { viralScore: 'desc' },
        skip: offset,
        take: limit
      })

      if (cachedInfluencers.length > 0) {
        // キャッシュデータから最新投稿を取得
        const influencersWithPosts = await Promise.all(
          cachedInfluencers.map(async (influencer) => {
            const recentPosts = await prisma.buzzPost.findMany({
              where: { authorUsername: influencer.username },
              orderBy: { postedAt: 'desc' },
              take: 3,
              select: {
                id: true,
                content: true,
                likesCount: true,
                retweetsCount: true,
                impressionsCount: true,
                postedAt: true,
                url: true
              }
            })

            return {
              username: influencer.username,
              userId: influencer.userId,
              followers: influencer.followers,
              verified: influencer.verified,
              viralScore: influencer.viralScore,
              engagementRate: influencer.engagementRate,
              primaryCategory: influencer.primaryCategory,
              categoryScores: influencer.categoryScores as Record<string, number>,
              metrics: period === '7d' ? influencer.metrics7d : influencer.metrics30d,
              recentPosts,
              lastActiveAt: influencer.lastActiveAt,
              lastAnalyzedAt: influencer.lastAnalyzedAt
            }
          })
        )

        const total = await prisma.buzzInfluencer.count({
          where: category !== 'all' ? { primaryCategory: category } : {}
        })

        return NextResponse.json({
          influencers: influencersWithPosts,
          total,
          limit,
          offset,
          category,
          period,
          sortBy,
          fromCache: true
        })
      }
    }
    // 期間フィルタの設定
    let dateFilter = {}
    const now = new Date()
    switch (period) {
      case '1d':
        dateFilter = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        break
      case '7d':
        dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        break
      case '30d':
        dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        break
    }

    // カテゴリフィルタの設定
    let themeFilter = {}
    if (category !== 'all') {
      const categoryMap: Record<string, string[]> = {
        ai: ['AI', '人工知能', 'ChatGPT', 'LLM', 'GPT', 'Claude', 'Gemini'],
        work: ['働き方', 'リモートワーク', 'キャリア', '転職', '副業', 'フリーランス'],
        creative: ['クリエイティブ', 'デザイン', 'アート', '創造', 'イノベーション']
      }
      const keywords = categoryMap[category] || []
      if (keywords.length > 0) {
        themeFilter = {
          OR: keywords.map(keyword => ({
            content: { contains: keyword, mode: 'insensitive' as const }
          }))
        }
      }
    }

    // 著者別の集計データ取得
    const influencersData = await prisma.buzzPost.groupBy({
      by: ['authorUsername', 'authorId'],
      where: {
        postedAt: dateFilter,
        ...themeFilter
      },
      _count: {
        id: true
      },
      _sum: {
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true
      },
      _avg: {
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true,
        authorFollowers: true
      },
      _max: {
        authorFollowers: true,
        authorVerified: true
      }
    })

    // エンゲージメント率を計算してデータを整形
    const influencers = influencersData.map(data => {
      const totalEngagement = (data._sum.likesCount || 0) + 
                            (data._sum.retweetsCount || 0) + 
                            (data._sum.repliesCount || 0)
      const totalImpressions = data._sum.impressionsCount || 0
      const avgEngagement = (data._avg.likesCount || 0) + 
                          (data._avg.retweetsCount || 0) + 
                          (data._avg.repliesCount || 0)
      const avgImpressions = data._avg.impressionsCount || 0
      
      return {
        username: data.authorUsername,
        userId: data.authorId,
        followers: data._max.authorFollowers || 0,
        verified: data._max.authorVerified || false,
        postCount: data._count.id,
        totalEngagement,
        totalImpressions,
        avgEngagementPerPost: avgEngagement,
        avgImpressionsPerPost: avgImpressions,
        engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
        avgEngagementRate: avgImpressions > 0 ? (avgEngagement / avgImpressions) * 100 : 0
      }
    })

    // ソート処理
    let sortedInfluencers = [...influencers]
    switch (sortBy) {
      case 'engagement':
        sortedInfluencers.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
        break
      case 'followers':
        sortedInfluencers.sort((a, b) => b.followers - a.followers)
        break
      case 'posts':
        sortedInfluencers.sort((a, b) => b.postCount - a.postCount)
        break
    }

    // ページネーション
    const paginatedInfluencers = sortedInfluencers.slice(offset, offset + limit)

    // 各インフルエンサーの最新投稿を取得
    const influencersWithRecentPosts = await Promise.all(
      paginatedInfluencers.map(async (influencer) => {
        const recentPosts = await prisma.buzzPost.findMany({
          where: {
            authorUsername: influencer.username,
            postedAt: dateFilter,
            ...themeFilter
          },
          orderBy: {
            postedAt: 'desc'
          },
          take: 3,
          select: {
            id: true,
            content: true,
            likesCount: true,
            retweetsCount: true,
            impressionsCount: true,
            postedAt: true,
            url: true
          }
        })

        return {
          ...influencer,
          recentPosts
        }
      })
    )

    return NextResponse.json({
      influencers: influencersWithRecentPosts,
      total: influencers.length,
      limit,
      offset,
      category,
      period,
      sortBy
    })

  } catch (error) {
    console.error('Error fetching influencers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch influencers data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}