import { NextResponse } from 'next/server'
import { prisma } from '@/lib/generated/prisma'
import { TwitterApi } from 'twitter-api-v2'
import { env } from '@/lib/config/env'

// Vercel Cron用のセルフRT実行
export async function GET(request: Request) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  try {
    console.log('[CRON] Starting scheduled RTs processing...')
    
    // 実行予定のRTを取得
    const pendingRTs = await prisma.scheduledRetweet.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() }
      },
      include: {
        viralDraft: true,
        cotDraft: true
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10 // 一度に処理する最大数
    })
    
    console.log(`[CRON] Found ${pendingRTs.length} RTs to process`)
    
    if (pendingRTs.length === 0) {
      return NextResponse.json({ 
        message: 'No scheduled RTs to process',
        timestamp: new Date().toISOString()
      })
    }
    
    // Twitter APIクライアント初期化
    const twitterClient = new TwitterApi({
      appKey: env.TWITTER_API_KEY,
      appSecret: env.TWITTER_API_SECRET,
      accessToken: env.TWITTER_ACCESS_TOKEN,
      accessSecret: env.TWITTER_ACCESS_SECRET,
    })
    
    const v2Client = twitterClient.v2
    const results = []
    
    // 各RTを実行
    for (const rt of pendingRTs) {
      try {
        console.log(`[CRON] Processing RT ${rt.id} for post ${rt.originalPostId}`)
        
        // RTを実行
        if (rt.addComment && rt.commentText) {
          // コメント付きRT（Quote Tweet）
          const tweet = await v2Client.tweet({
            text: rt.commentText,
            quote_tweet_id: rt.originalPostId
          })
          
          await prisma.scheduledRetweet.update({
            where: { id: rt.id },
            data: {
              status: 'EXECUTED',
              executedAt: new Date(),
              rtPostId: tweet.data.id
            }
          })
          
          results.push({
            id: rt.id,
            status: 'success',
            type: 'quote',
            rtPostId: tweet.data.id
          })
          
        } else {
          // 通常のRT
          const result = await v2Client.retweet(
            (await v2Client.me()).data.id,
            rt.originalPostId
          )
          
          await prisma.scheduledRetweet.update({
            where: { id: rt.id },
            data: {
              status: 'EXECUTED',
              executedAt: new Date(),
              rtPostId: rt.originalPostId // RTの場合は元のポストID
            }
          })
          
          results.push({
            id: rt.id,
            status: 'success',
            type: 'retweet'
          })
        }
        
        // アクティビティログ
        await prisma.sessionActivityLog.create({
          data: {
            sessionId: rt.viralDraftId || rt.cotDraftId || 'system',
            sessionType: rt.viralDraftId ? 'VIRAL' : rt.cotDraftId ? 'COT' : 'SYSTEM',
            activityType: 'RT_EXECUTED',
            details: {
              rtId: rt.id,
              originalPostId: rt.originalPostId,
              strategy: rt.rtStrategy,
              withComment: rt.addComment
            }
          }
        })
        
        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error: any) {
        console.error(`[CRON] Failed to RT ${rt.id}:`, error)
        
        // エラーを記録
        await prisma.scheduledRetweet.update({
          where: { id: rt.id },
          data: {
            status: 'FAILED',
            error: error.message || 'Unknown error'
          }
        })
        
        results.push({
          id: rt.id,
          status: 'failed',
          error: error.message
        })
        
        // Twitter APIエラーの場合は処理を中断
        if (error.code === 429) {
          console.error('[CRON] Rate limit reached, stopping processing')
          break
        }
      }
    }
    
    console.log('[CRON] RT processing completed')
    
    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[CRON] Scheduled RTs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Vercel Cron設定: 10分ごと
export const runtime = 'nodejs'
export const maxDuration = 60