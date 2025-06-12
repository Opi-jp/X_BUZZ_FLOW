import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, metric } = body

    if (!postId || !metric) {
      return NextResponse.json(
        { error: '投稿IDとメトリックが必要です' },
        { status: 400 }
      )
    }

    // 投稿を取得
    const post = await prisma.viralPost.findUnique({
      where: { id: postId }
    })

    if (!post || !post.postUrl) {
      return NextResponse.json(
        { error: '投稿が見つからないか、まだ投稿されていません' },
        { status: 404 }
      )
    }

    // Tweet IDを抽出
    const tweetId = post.postUrl.split('/').pop()
    if (!tweetId) {
      return NextResponse.json(
        { error: 'Tweet IDが取得できません' },
        { status: 400 }
      )
    }

    // Twitter APIクライアントを初期化
    const twitterClient = new TwitterApi(session.accessToken)

    // ツイートの統計情報を取得
    const tweet = await twitterClient.v2.singleTweet(tweetId, {
      'tweet.fields': ['public_metrics', 'created_at']
    })

    const metrics = tweet.data.public_metrics
    
    if (!metrics) {
      throw new Error('メトリクスが取得できませんでした')
    }

    // 現在のフォロワー数を取得
    const user = await twitterClient.v2.me()
    const currentFollowers = user.data.public_metrics?.followers_count || 0

    // パフォーマンスレコードを取得または作成
    let performance = await prisma.viralPostPerformance.findUnique({
      where: { postId }
    })

    if (!performance) {
      performance = await prisma.viralPostPerformance.create({
        data: { postId }
      })
    }

    // メトリックに応じてデータを更新
    const updateData: any = {}
    
    switch (metric) {
      case '30m':
        updateData.impressions30m = metrics.impression_count || 0
        updateData.likes30m = metrics.like_count || 0
        updateData.retweets30m = metrics.retweet_count || 0
        updateData.comments30m = metrics.reply_count || 0
        break
      
      case '1h':
        updateData.impressions1h = metrics.impression_count || 0
        updateData.likes1h = metrics.like_count || 0
        updateData.retweets1h = metrics.retweet_count || 0
        updateData.comments1h = metrics.reply_count || 0
        break
      
      case '24h':
        updateData.impressions24h = metrics.impression_count || 0
        updateData.likes24h = metrics.like_count || 0
        updateData.retweets24h = metrics.retweet_count || 0
        updateData.comments24h = metrics.reply_count || 0
        
        // 24時間後のフォロワー増加数を計算（概算）
        // 実際には投稿前のフォロワー数を保存しておく必要がある
        updateData.followers24h = 0 // TODO: 実装改善
        
        // エンゲージメント率を計算
        const totalEngagements = (metrics.like_count || 0) + 
                                (metrics.retweet_count || 0) + 
                                (metrics.reply_count || 0)
        updateData.engagementRate = metrics.impression_count > 0 
          ? totalEngagements / metrics.impression_count 
          : 0
        
        // バイラル係数を計算（RT数 / インプレッション数）
        updateData.viralCoeff = metrics.impression_count > 0 
          ? (metrics.retweet_count || 0) / metrics.impression_count * 100
          : 0
        break
      
      default:
        return NextResponse.json(
          { error: '無効なメトリックです' },
          { status: 400 }
        )
    }

    // パフォーマンスデータを更新
    const updatedPerformance = await prisma.viralPostPerformance.update({
      where: { id: performance.id },
      data: updateData
    })

    // 分析ログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'twitter',
        phase: 'performance_tracking',
        prompt: `${postId} - ${metric}`,
        response: {
          metric,
          metrics,
          updateData
        },
        success: true
      }
    })

    return NextResponse.json({
      success: true,
      metric,
      performance: updatedPerformance
    })

  } catch (error) {
    console.error('Performance tracking error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'twitter',
        phase: 'performance_tracking',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'パフォーマンストラッキングでエラーが発生しました' },
      { status: 500 }
    )
  }
}

// バッチでパフォーマンスを追跡
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const metric = searchParams.get('metric') || '30m'

  try {
    // 追跡が必要な投稿を取得
    const cutoffTime = new Date()
    
    switch (metric) {
      case '30m':
        cutoffTime.setMinutes(cutoffTime.getMinutes() - 30)
        break
      case '1h':
        cutoffTime.setHours(cutoffTime.getHours() - 1)
        break
      case '24h':
        cutoffTime.setHours(cutoffTime.getHours() - 24)
        break
    }

    const posts = await prisma.viralPost.findMany({
      where: {
        postedAt: { lte: cutoffTime },
        performance: {
          [`impressions${metric.replace('m', 'm').replace('h', 'h')}`]: null
        }
      },
      take: 10
    })

    const results = []
    
    for (const post of posts) {
      try {
        const response = await POST(
          new NextRequest(request.url, {
            method: 'POST',
            body: JSON.stringify({ postId: post.id, metric })
          })
        )
        
        const result = await response.json()
        results.push({ postId: post.id, ...result })
      } catch (error) {
        console.error(`Failed to track ${post.id}:`, error)
        results.push({ 
          postId: post.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      metric,
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('Batch performance tracking error:', error)
    return NextResponse.json(
      { error: 'バッチパフォーマンストラッキングでエラーが発生しました' },
      { status: 500 }
    )
  }
}