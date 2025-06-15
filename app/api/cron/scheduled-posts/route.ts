import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// Twitter APIクライアントの取得
async function getTwitterClient() {
  // アプリケーション認証（投稿用）
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  })
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
    // 投稿予定の下書きを取得
    const now = new Date()
    const drafts = await prisma.cotDraft.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now
        }
      },
      include: {
        session: true
      },
      take: 10 // 一度に処理する最大数
    })
    
    console.log(`[CRON] Found ${drafts.length} scheduled drafts to post`)
    
    const results = []
    
    for (const draft of drafts) {
      try {
        // Twitter API v2を使用した実際の投稿
        const content = draft.editedContent || draft.content || ''
        
        // Twitter APIクライアントの初期化
        const twitterClient = await getTwitterClient()
        
        try {
          let postId: string
          
          if (process.env.NODE_ENV === 'development') {
            // 開発環境：モック投稿
            postId = `mock_cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            console.log(`[CRON MOCK] Simulated posting to Twitter:`, {
              draftId: draft.id,
              postId,
              content: content.substring(0, 100) + '...'
            })
            // 投稿の待機をシミュレート
            await new Promise(resolve => setTimeout(resolve, 500))
          } else {
            // 本番環境：実際のTwitter投稿
            const twitterClient = await getTwitterClient()
            const tweet = await twitterClient.v2.tweet(content)
            postId = tweet.data.id
            
            console.log(`[CRON] Successfully posted to Twitter:`, {
              draftId: draft.id,
              postId,
              content: content.substring(0, 100) + '...'
            })
          }
        
        // 成功したらDBを更新
        await prisma.cotDraft.update({
          where: { id: draft.id },
          data: {
            status: 'POSTED',
            postedAt: new Date(),
            postId
          }
        })
        
        // パフォーマンス追跡の初期化（仮実装）
        await prisma.cotDraftPerformance.create({
          data: {
            draftId: draft.id,
            // 初期値は0
            likes30m: 0,
            retweets30m: 0,
            replies30m: 0,
            impressions30m: 0
          }
        })
        
        results.push({
          draftId: draft.id,
          status: 'success',
          postId
        })
        
        } catch (twitterError) {
          // Twitter API エラーの詳細ログ
          console.error(`[CRON] Twitter API error:`, twitterError)
          throw twitterError
        }
        
      } catch (error) {
        console.error(`[CRON] Failed to post draft ${draft.id}:`, error)
        
        results.push({
          draftId: draft.id,
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
    console.error('[CRON] Scheduled posts error:', error)
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