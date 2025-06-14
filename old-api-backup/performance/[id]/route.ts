import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET: 投稿のパフォーマンスデータを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params

    // 下書きを取得
    const draft = await prisma.contentDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        status: true,
        metadata: true,
        content: true,
        editedContent: true,
        title: true
      }
    })

    if (!draft) {
      return NextResponse.json(
        { error: '下書きが見つかりません' },
        { status: 404 }
      )
    }

    // metadataからツイート情報を取得
    const metadata = draft.metadata as any
    const tweetId = metadata?.tweetId
    const postedAt = metadata?.postedAt

    if (!tweetId || draft.status !== 'posted') {
      return NextResponse.json({
        success: true,
        draft: {
          id: draft.id,
          title: draft.title,
          status: draft.status
        },
        performance: null,
        message: 'まだ投稿されていません'
      })
    }

    // パフォーマンスデータを取得または作成
    let performance = await prisma.contentDraft.findUnique({
      where: { id: draftId },
      select: {
        metadata: true
      }
    })

    const performanceData = (performance?.metadata as any)?.performance || {
      impressions30m: null,
      likes30m: null,
      retweets30m: null,
      comments30m: null,
      impressions1h: null,
      likes1h: null,
      retweets1h: null,
      comments1h: null,
      impressions24h: null,
      likes24h: null,
      retweets24h: null,
      comments24h: null,
      engagementRate: null,
      lastUpdated: null
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        title: draft.title,
        status: draft.status,
        postedAt,
        tweetId,
        postUrl: metadata?.postUrl
      },
      performance: performanceData
    })

  } catch (error) {
    console.error('Performance fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'パフォーマンスデータの取得でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST: パフォーマンスデータを更新（Twitter APIから取得）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    const { id: draftId } = await params
    const body = await request.json()
    const { tweetId, metric } = body

    // 下書きを取得
    const draft = await prisma.contentDraft.findUnique({
      where: { id: draftId },
      select: { metadata: true }
    })

    if (!draft) {
      return NextResponse.json(
        { error: '下書きが見つかりません' },
        { status: 404 }
      )
    }

    const metadata = draft.metadata as any
    const actualTweetId = tweetId || metadata?.tweetId

    if (!actualTweetId) {
      return NextResponse.json(
        { error: 'ツイートIDが見つかりません' },
        { status: 400 }
      )
    }

    // Twitter APIクライアントを初期化
    const twitterClient = new TwitterApi(session.accessToken)

    try {
      // ツイートの統計情報を取得
      const tweet = await twitterClient.v2.singleTweet(actualTweetId, {
        'tweet.fields': ['public_metrics', 'created_at']
      })

      const metrics = tweet.data.public_metrics
      
      if (!metrics) {
        throw new Error('メトリクスが取得できませんでした')
      }

      // 現在のパフォーマンスデータを取得
      const currentPerformance = metadata?.performance || {}

      // メトリックに応じてデータを更新
      const updateData: any = { ...currentPerformance }
      
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
          
          // エンゲージメント率を計算
          const totalEngagements = (metrics.like_count || 0) + 
                                  (metrics.retweet_count || 0) + 
                                  (metrics.reply_count || 0)
          updateData.engagementRate = metrics.impression_count > 0 
            ? (totalEngagements / metrics.impression_count * 100).toFixed(2)
            : 0
          break
        
        default:
          // メトリック指定なしの場合は現在の値を取得
          updateData.currentImpressions = metrics.impression_count || 0
          updateData.currentLikes = metrics.like_count || 0
          updateData.currentRetweets = metrics.retweet_count || 0
          updateData.currentComments = metrics.reply_count || 0
      }

      updateData.lastUpdated = new Date().toISOString()

      // メタデータを更新
      await prisma.contentDraft.update({
        where: { id: draftId },
        data: {
          metadata: {
            ...metadata,
            performance: updateData
          }
        }
      })

      return NextResponse.json({
        success: true,
        metric,
        performance: updateData,
        rawMetrics: metrics
      })

    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      
      return NextResponse.json(
        { 
          error: 'Twitter APIエラー',
          details: twitterError.data?.detail || twitterError.message
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Performance update error:', error)
    
    return NextResponse.json(
      { 
        error: 'パフォーマンス更新でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}