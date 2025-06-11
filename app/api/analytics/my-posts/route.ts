import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Analytics API - Session:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      username: session?.user?.username,
      hasAccessToken: !!session?.accessToken
    })
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    // DBからユーザー情報とアクセストークンを取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        accessToken: true,
        username: true,
        twitterId: true
      }
    })
    
    if (!user?.accessToken) {
      console.error('No access token found for user:', session.user.id)
      return NextResponse.json({ error: 'Twitterアクセストークンが見つかりません' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    
    // Twitter APIクライアントの初期化
    const client = new TwitterApi(user.accessToken)
    
    // 自分のユーザー情報を取得
    const me = await client.v2.me({
      'user.fields': ['public_metrics', 'created_at', 'description', 'verified']
    })
    
    // 最近のツイートを取得
    const tweets = await client.v2.userTimeline(me.data.id, {
      max_results: 100,
      'tweet.fields': ['created_at', 'public_metrics', 'referenced_tweets'],
      start_time: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    })
    
    // ツイートデータを整形
    const tweetsData = tweets.data.data?.map(tweet => {
      const metrics = tweet.public_metrics as any || {}
      const impressionCount = metrics.impression_count || 0
      const likeCount = metrics.like_count || 0
      const retweetCount = metrics.retweet_count || 0
      const replyCount = metrics.reply_count || 0
      const quoteCount = metrics.quote_count || 0
      
      const engagementRate = impressionCount > 0 
        ? ((likeCount + retweetCount + replyCount + quoteCount) / impressionCount) * 100
        : 0
        
      return {
        id: tweet.id,
        content: tweet.text,
        createdAt: tweet.created_at,
        impressions: impressionCount,
        likes: likeCount,
        retweets: retweetCount,
        replies: replyCount,
        quotes: quoteCount,
        engagementRate: engagementRate
      }
    }) || []
    
    // 統計情報を計算
    const totalTweets = tweetsData.length
    const totalImpressions = tweetsData.reduce((sum, t) => sum + t.impressions, 0)
    const totalLikes = tweetsData.reduce((sum, t) => sum + t.likes, 0)
    const totalRetweets = tweetsData.reduce((sum, t) => sum + t.retweets, 0)
    const avgEngagementRate = totalTweets > 0
      ? tweetsData.reduce((sum, t) => sum + t.engagementRate, 0) / totalTweets
      : 0
      
    // 時間帯別パフォーマンス分析
    const hourlyPerformance = tweetsData.reduce((acc, tweet) => {
      const hour = new Date(tweet.createdAt as string).getHours()
      if (!acc[hour]) {
        acc[hour] = { count: 0, totalEngagement: 0 }
      }
      acc[hour].count++
      acc[hour].totalEngagement += tweet.engagementRate
      return acc
    }, {} as Record<number, { count: number; totalEngagement: number }>)
    
    const bestHours = Object.entries(hourlyPerformance)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgEngagement: data.totalEngagement / data.count
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3)
    
    return NextResponse.json({
      profile: {
        username: me.data.username,
        name: me.data.name,
        followers: me.data.public_metrics?.followers_count || 0,
        following: me.data.public_metrics?.following_count || 0,
        tweets: me.data.public_metrics?.tweet_count || 0,
        verified: me.data.verified || false,
      },
      analytics: {
        tweets: tweetsData,
        summary: {
          totalTweets,
          totalImpressions,
          totalLikes,
          totalRetweets,
          avgEngagementRate,
        },
        insights: {
          bestPostingHours: bestHours,
          topTweets: tweetsData
            .sort((a, b) => b.engagementRate - a.engagementRate)
            .slice(0, 5),
        }
      }
    })
  } catch (error) {
    console.error('Error fetching my posts analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}