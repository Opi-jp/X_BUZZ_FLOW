import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'

/**
 * Publish Module - Post Now API
 * 
 * 責務: コンテンツの即時投稿
 * 
 * データフロー:
 * Create (Draft) → Publish (Post) → Analyze (Metrics)
 */

// リクエストバリデーション
const PostNowSchema = z.object({
  content: z.string().min(1).max(280),
  draftId: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
  replyToId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const body = await request.json()
    const { content, draftId, hashtags, mediaIds, replyToId } = PostNowSchema.parse(body)
    
    // ハッシュタグを含めたテキストを構築
    let tweetText = content
    if (hashtags && hashtags.length > 0) {
      tweetText += '\n\n' + hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')
    }
    
    // 文字数チェック
    if (tweetText.length > 280) {
      return errorResponse(new Error('Tweet exceeds 280 characters'), 400)
    }
    
    // Twitter APIクライアントを作成
    let twitterClient: TwitterApi | null = null
    
    // セッションのアクセストークンを使用
    if (session.accessToken) {
      twitterClient = new TwitterApi(session.accessToken as string)
    } else {
      // DBからユーザーの認証情報を取得
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          twitterAccessToken: true,
          twitterRefreshToken: true
        }
      })
      
      if (user?.twitterAccessToken) {
        twitterClient = new TwitterApi(user.twitterAccessToken)
      }
    }
    
    if (!twitterClient) {
      return errorResponse(new Error('Twitter authentication required'), 401)
    }
    
    // ツイートを投稿
    const tweetData: any = { text: tweetText }
    
    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds }
    }
    
    if (replyToId) {
      tweetData.reply = { in_reply_to_tweet_id: replyToId }
    }
    
    const tweet = await twitterClient.v2.tweet(tweetData)
    
    // 投稿URLを構築
    const tweetUrl = `https://twitter.com/${session.user?.username || 'user'}/status/${tweet.data.id}`
    
    // 下書きのステータスを更新
    if (draftId) {
      await prisma.viralDraftV2.update({
        where: { id: draftId },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          tweetId: tweet.data.id
        }
      })
    }
    
    // パフォーマンス記録の作成
    const performance = await prisma.viralDraftPerformance.create({
      data: {
        draftId: draftId || `direct-post-${Date.now()}`,
        tweetId: tweet.data.id,
        impressions: 0,
        likes: 0,
        retweets: 0,
        replies: 0,
        engagementRate: 0,
        viralScore: 0
      }
    })
    
    // Display Layer用のレスポンス
    return successResponse({
      id: tweet.data.id,
      text: tweet.data.text,
      url: tweetUrl,
      postedAt: new Date().toISOString(),
      performanceId: performance.id,
      stats: {
        characterCount: tweetText.length,
        hashtagCount: hashtags?.length || 0,
        mediaCount: mediaIds?.length || 0
      }
    }, 'Successfully posted to Twitter')
    
  } catch (error) {
    console.error('[Publish/Post/Now] Error:', error)
    
    if (error instanceof z.ZodError) {
      return errorResponse(new Error('Invalid request'), 400)
    }
    
    if (error instanceof Error && error.message.includes('Twitter')) {
      return errorResponse(error, 401)
    }
    
    return errorResponse(error)
  }
}

// 投稿履歴を取得
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // 投稿済みの下書きを取得
    const posts = await prisma.viralDraftV2.findMany({
      where: {
        status: 'POSTED',
        session: {
          userId: session.user.id
        }
      },
      orderBy: { postedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        content: true,
        hashtags: true,
        postedAt: true,
        tweetId: true,
        performance: {
          select: {
            impressions: true,
            likes: true,
            retweets: true,
            engagementRate: true
          }
        }
      }
    })
    
    // Summary View用のデータ変換
    const summaryData = posts.map(post => ({
      id: post.id,
      title: post.title,
      preview: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      postedAt: post.postedAt,
      tweetUrl: post.tweetId ? `https://twitter.com/user/status/${post.tweetId}` : null,
      metrics: {
        impressions: post.performance?.impressions || 0,
        engagement: post.performance?.engagementRate || 0
      }
    }))
    
    return successResponse({
      posts: summaryData,
      pagination: {
        offset,
        limit,
        hasMore: posts.length === limit
      }
    })
    
  } catch (error) {
    return errorResponse(error)
  }
}