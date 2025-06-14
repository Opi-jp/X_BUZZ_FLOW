import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// Vercel Cronの設定
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Vercel Cronの認証チェック
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // パフォーマンス収集が必要な投稿を取得
    const postsToCheck = await prisma.viralPost.findMany({
      where: {
        postedAt: { not: null }, // 投稿済みのもののみ
        OR: [
          // 30分後のメトリクス未収集
          {
            postedAt: {
              lte: thirtyMinutesAgo,
              gte: new Date(thirtyMinutesAgo.getTime() - 10 * 60 * 1000) // 30-40分前
            },
            performance: null
          },
          // 1時間後のメトリクス未収集
          {
            postedAt: {
              lte: oneHourAgo,
              gte: new Date(oneHourAgo.getTime() - 30 * 60 * 1000) // 1-1.5時間前
            },
            performance: {
              impressions1h: null
            }
          },
          // 24時間後のメトリクス未収集
          {
            postedAt: {
              lte: oneDayAgo,
              gte: new Date(oneDayAgo.getTime() - 60 * 60 * 1000) // 24-25時間前
            },
            performance: {
              impressions24h: null
            }
          }
        ]
      },
      take: 10 // 一度に処理する最大数
    })
    
    console.log(`Found ${postsToCheck.length} posts to check performance`)
    
    const results = []
    
    // Twitter APIクライアント初期化
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    })
    
    for (const post of postsToCheck) {
      try {
        if (!post.postUrl) continue
        
        // 投稿の経過時間を計算
        const elapsedMinutes = Math.floor((now.getTime() - post.postedAt!.getTime()) / (60 * 1000))
        let timeframe: string
        
        if (elapsedMinutes >= 1440) { // 24時間以上
          timeframe = '24h'
        } else if (elapsedMinutes >= 60) { // 1時間以上
          timeframe = '1h'
        } else if (elapsedMinutes >= 30) { // 30分以上
          timeframe = '30m'
        } else {
          continue // まだ早い
        }
        
        // すでにこのタイムフレームのデータがあるかチェック
        const existingPerformance = await prisma.viralPostPerformance.findFirst({
          where: {
            postId: post.id
          }
        })
        
        if (existingPerformance && 
            ((timeframe === '30m' && existingPerformance.impressions30m !== null) ||
             (timeframe === '1h' && existingPerformance.impressions1h !== null) ||
             (timeframe === '24h' && existingPerformance.impressions24h !== null))) {
          continue // すでに収集済み
        }
        
        // URLからツイートIDを抽出
        const tweetIdMatch = post.postUrl.match(/status\/(\d+)/)
        if (!tweetIdMatch) continue
        const tweetId = tweetIdMatch[1]
        
        // Twitter APIでメトリクスを取得
        // 注意: v2 APIではメトリクスの取得に制限があります
        // 実際の実装では、適切なエンドポイントを使用してください
        const tweet = await twitterClient.v2.singleTweet(tweetId, {
          'tweet.fields': ['public_metrics', 'created_at']
        })
        
        const metrics = tweet.data.public_metrics
        
        if (metrics) {
          // エンゲージメント率の計算
          const totalEngagements = 
            (metrics.like_count || 0) + 
            (metrics.retweet_count || 0) + 
            (metrics.reply_count || 0)
          
          const engagementRate = metrics.impression_count > 0
            ? (totalEngagements / metrics.impression_count) * 100
            : 0
          
          // パフォーマンスデータを保存または更新
          const performanceData: any = {
            postId: post.id,
            engagementRate: Number(engagementRate.toFixed(2))
          }
          
          // タイムフレームに応じてフィールドを設定
          if (timeframe === '30m') {
            performanceData.impressions30m = metrics.impression_count || 0
            performanceData.likes30m = metrics.like_count || 0
            performanceData.retweets30m = metrics.retweet_count || 0
            performanceData.comments30m = metrics.reply_count || 0
          } else if (timeframe === '1h') {
            performanceData.impressions1h = metrics.impression_count || 0
            performanceData.likes1h = metrics.like_count || 0
            performanceData.retweets1h = metrics.retweet_count || 0
            performanceData.comments1h = metrics.reply_count || 0
          } else if (timeframe === '24h') {
            performanceData.impressions24h = metrics.impression_count || 0
            performanceData.likes24h = metrics.like_count || 0
            performanceData.retweets24h = metrics.retweet_count || 0
            performanceData.comments24h = metrics.reply_count || 0
          }
          
          // 既存のレコードがあれば更新、なければ作成
          if (existingPerformance) {
            await prisma.viralPostPerformance.update({
              where: { id: existingPerformance.id },
              data: performanceData
            })
          } else {
            await prisma.viralPostPerformance.create({
              data: performanceData
            })
          }
          
          results.push({
            postId: post.id,
            timeframe,
            status: 'success',
            metrics: {
              impressions: metrics.impression_count,
              engagementRate: Number(engagementRate.toFixed(2))
            }
          })
        }
        
      } catch (error) {
        console.error(`Failed to collect performance for post ${post.id}:`, error)
        results.push({
          postId: post.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // 分析インサイトの生成（24時間後のデータがある投稿）
    const postsWithFullData = await prisma.viralPost.findMany({
      where: {
        performance: {
          impressions24h: { not: null }
        }
      },
      include: {
        performance: true,
        opportunity: true
      },
      take: 5,
      orderBy: {
        postedAt: 'desc'
      }
    })
    
    // 高パフォーマンス投稿の傾向分析
    const insights = []
    for (const post of postsWithFullData) {
      const perf = post.performance
      if (perf && perf.engagementRate && perf.engagementRate > 5) { // エンゲージメント率5%以上
        insights.push({
          postId: post.id,
          content: post.content?.substring(0, 100),
          engagementRate: perf.engagementRate,
          impressions: perf.impressions24h,
          conceptType: post.conceptType,
          hashtags: post.hashtags
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      insights,
      nextRun: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
    })
    
  } catch (error) {
    console.error('Performance collection cron error:', error)
    return NextResponse.json(
      { 
        error: 'Performance collection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}