import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// Twitter APIクライアントの取得
async function getTwitterClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  })
}

// Kaito APIでのメトリクス取得（フォールバック）
async function getKaitoMetrics(postId: string) {
  try {
    const response = await fetch(`https://kaitoeasyapi.com/api/tweet-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KAITO_API_KEY}`
      },
      body: JSON.stringify({ tweetId: postId })
    })
    
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.log('[KAITO] API error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV !== 'development') {
    // Cron認証（本番環境のみ）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  
  try {
    console.log('[PERFORMANCE CRON] Starting performance collection...')
    
    // パフォーマンス追跡が必要な投稿を取得
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // 投稿済みで、パフォーマンス追跡が未完了の下書きを取得
    const drafts = await prisma.cotDraft.findMany({
      where: {
        status: 'POSTED',
        postedAt: {
          not: null
        },
        postId: {
          not: null
        },
        performance: {
          OR: [
            { likes30m: null },
            { likes1h: null }, 
            { likes24h: null }
          ]
        }
      },
      include: {
        performance: true
      },
      take: 20 // 一度に処理する最大数
    })
    
    console.log(`[PERFORMANCE CRON] Found ${drafts.length} drafts to track`)
    
    const results = []
    let twitterClient: TwitterApi | null = null
    
    try {
      twitterClient = await getTwitterClient()
    } catch (twitterError) {
      console.log('[PERFORMANCE CRON] Twitter API unavailable, using Kaito API fallback')
    }
    
    for (const draft of drafts) {
      try {
        if (!draft.postId || !draft.postedAt) continue
        
        const postedAt = new Date(draft.postedAt)
        const timeSincePost = now.getTime() - postedAt.getTime()
        
        let metrics = null
        
        // Twitter API v2でメトリクス取得を試行
        if (twitterClient) {
          try {
            const tweet = await twitterClient.v2.singleTweet(draft.postId, {
              'tweet.fields': ['public_metrics']
            })
            
            if (tweet.data.public_metrics) {
              metrics = {
                likes: tweet.data.public_metrics.like_count || 0,
                retweets: tweet.data.public_metrics.retweet_count || 0,
                replies: tweet.data.public_metrics.reply_count || 0,
                impressions: tweet.data.public_metrics.impression_count || 0
              }
            }
          } catch (twitterApiError) {
            console.log(`[PERFORMANCE CRON] Twitter API failed for ${draft.postId}, trying Kaito...`)
          }
        }
        
        // Twitter APIが失敗した場合、Kaito APIを使用
        if (!metrics) {
          const kaitoMetrics = await getKaitoMetrics(draft.postId)
          if (kaitoMetrics) {
            metrics = {
              likes: kaitoMetrics.likes || 0,
              retweets: kaitoMetrics.retweets || 0,
              replies: kaitoMetrics.replies || 0,
              impressions: kaitoMetrics.impressions || 0
            }
          }
        }
        
        if (!metrics) {
          console.log(`[PERFORMANCE CRON] No metrics available for ${draft.postId}`)
          continue
        }
        
        // パフォーマンスレコードの更新データを準備
        const updateData: any = {}
        
        // 30分後のメトリクス
        if (timeSincePost >= 30 * 60 * 1000 && draft.performance?.likes30m === null) {
          updateData.likes30m = metrics.likes
          updateData.retweets30m = metrics.retweets
          updateData.replies30m = metrics.replies
          updateData.impressions30m = metrics.impressions
        }
        
        // 1時間後のメトリクス
        if (timeSincePost >= 60 * 60 * 1000 && draft.performance?.likes1h === null) {
          updateData.likes1h = metrics.likes
          updateData.retweets1h = metrics.retweets
          updateData.replies1h = metrics.replies
          updateData.impressions1h = metrics.impressions
        }
        
        // 24時間後のメトリクス
        if (timeSincePost >= 24 * 60 * 60 * 1000 && draft.performance?.likes24h === null) {
          updateData.likes24h = metrics.likes
          updateData.retweets24h = metrics.retweets
          updateData.replies24h = metrics.replies
          updateData.impressions24h = metrics.impressions
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.cotDraftPerformance.update({
            where: { draftId: draft.id },
            data: updateData
          })
          
          console.log(`[PERFORMANCE CRON] Updated metrics for ${draft.postId}:`, updateData)
          
          results.push({
            draftId: draft.id,
            postId: draft.postId,
            status: 'updated',
            metrics: updateData
          })
        } else {
          results.push({
            draftId: draft.id,
            postId: draft.postId,
            status: 'no_update_needed'
          })
        }
        
      } catch (error) {
        console.error(`[PERFORMANCE CRON] Failed to collect performance for draft ${draft.id}:`, error)
        
        results.push({
          draftId: draft.id,
          postId: draft.postId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: drafts.length,
      results
    })
    
  } catch (error) {
    console.error('[PERFORMANCE CRON] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Vercel Cronの設定
export const runtime = 'nodejs'
export const maxDuration = 60 // 1分