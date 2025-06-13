import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// Vercel Cronの認証
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
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    
    // 今から5分以内に投稿予定の下書きを取得
    const scheduledDrafts = await prisma.cotDraft.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: now,
          lte: fiveMinutesFromNow
        }
      },
      include: {
        session: true
      }
    })
    
    console.log(`Found ${scheduledDrafts.length} scheduled posts`)
    
    const results = []
    
    for (const draft of scheduledDrafts) {
      try {
        // Twitter認証情報を取得（実際の実装では、ユーザーごとの認証情報を管理）
        const twitterClient = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY!,
          appSecret: process.env.TWITTER_API_SECRET!,
          accessToken: process.env.TWITTER_ACCESS_TOKEN!,
          accessSecret: process.env.TWITTER_ACCESS_SECRET!,
        })
        
        // 投稿内容の最終チェック
        const content = draft.hook
        const hashtags = (draft.hashtags || []).map(tag => `#${tag}`).join(' ')
        const fullContent = `${content}\n\n${hashtags}`
        
        // 文字数チェック（URLは23文字として計算）
        if (fullContent.length > 280) {
          throw new Error('投稿内容が文字数制限を超えています')
        }
        
        // Twitter投稿
        const tweet = await twitterClient.v2.tweet(fullContent)
        
        // 下書きのステータスを更新
        await prisma.cotDraft.update({
          where: { id: draft.id },
          data: {
            status: 'POSTED',
            postedAt: new Date(),
            postId: tweet.data.id
          }
        })
        
        results.push({
          draftId: draft.id,
          tweetId: tweet.data.id,
          status: 'success',
          postedAt: new Date().toISOString()
        })
        
      } catch (error) {
        console.error(`Failed to post draft ${draft.id}:`, error)
        
        // エラーを記録
        await prisma.cotDraft.update({
          where: { id: draft.id },
          data: {
            status: 'CANCELLED'
            // エラー情報はログに記録
          }
        })
        
        results.push({
          draftId: draft.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      nextRun: new Date(now.getTime() + 5 * 60 * 1000).toISOString()
    })
    
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}