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
    const { postId } = body

    if (!postId) {
      return NextResponse.json(
        { error: '投稿IDが指定されていません' },
        { status: 400 }
      )
    }

    // 投稿を取得
    const post = await prisma.viralPost.findUnique({
      where: { id: postId },
      include: { opportunity: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      )
    }

    if (post.postedAt) {
      return NextResponse.json(
        { error: 'この投稿は既に投稿済みです' },
        { status: 400 }
      )
    }

    // Twitter APIクライアントを初期化
    const twitterClient = new TwitterApi(session.accessToken)

    let result
    let postUrl

    // 投稿タイプに応じて処理
    if (post.postType === 'thread' && post.threadContent) {
      // スレッド投稿
      const threadContent = post.threadContent as string[]
      const tweets = []
      
      for (let i = 0; i < threadContent.length; i++) {
        const tweetData: any = { text: threadContent[i] }
        
        // 最初のツイート以外は前のツイートにリプライ
        if (i > 0 && tweets[i - 1]) {
          tweetData.reply = {
            in_reply_to_tweet_id: tweets[i - 1].data.id
          }
        }
        
        const tweet = await twitterClient.v2.tweet(tweetData)
        tweets.push(tweet)
      }
      
      result = tweets[0] // 最初のツイートを結果として使用
      postUrl = `https://twitter.com/${session.user.username}/status/${tweets[0].data.id}`
    } else {
      // 単発投稿
      result = await twitterClient.v2.tweet({ text: post.content })
      postUrl = `https://twitter.com/${session.user.username}/status/${result.data.id}`
    }

    // 投稿情報を更新
    await prisma.viralPost.update({
      where: { id: postId },
      data: {
        postedAt: new Date(),
        postUrl
      }
    })

    // 機会のステータスを更新
    await prisma.viralOpportunity.update({
      where: { id: post.opportunityId },
      data: { status: 'posted' }
    })

    // 分析ログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'twitter',
        phase: 'post_creation',
        prompt: post.content,
        response: { tweetId: result.data.id, url: postUrl },
        success: true
      }
    })

    // パフォーマンストラッキングをスケジュール
    schedulePerformanceTracking(postId)

    return NextResponse.json({
      success: true,
      tweetId: result.data.id,
      url: postUrl
    })

  } catch (error) {
    console.error('Twitter post error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'twitter',
        phase: 'post_creation',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Twitter投稿でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// パフォーマンストラッキングをスケジュール
async function schedulePerformanceTracking(postId: string) {
  // 30分後、1時間後、24時間後にトラッキング
  const trackingTimes = [
    { delay: 30 * 60 * 1000, metric: '30m' },
    { delay: 60 * 60 * 1000, metric: '1h' },
    { delay: 24 * 60 * 60 * 1000, metric: '24h' }
  ]

  trackingTimes.forEach(({ delay, metric }) => {
    setTimeout(async () => {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/viral/track-performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, metric })
        })
      } catch (error) {
        console.error(`Performance tracking error (${metric}):`, error)
      }
    }, delay)
  })
}

// スケジュールされた投稿を自動投稿
export async function GET(request: NextRequest) {
  try {
    // スケジュール時刻を過ぎた未投稿の投稿を取得
    const scheduledPosts = await prisma.viralPost.findMany({
      where: {
        scheduledAt: { lte: new Date() },
        postedAt: null
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5 // 一度に最大5件まで
    })

    const results = []
    
    for (const post of scheduledPosts) {
      try {
        // 各投稿を実行
        const response = await POST(
          new NextRequest(request.url, {
            method: 'POST',
            body: JSON.stringify({ postId: post.id })
          })
        )
        
        const result = await response.json()
        results.push({ postId: post.id, ...result })
      } catch (error) {
        console.error(`Failed to post ${post.id}:`, error)
        results.push({ 
          postId: post.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('Scheduled post error:', error)
    return NextResponse.json(
      { error: 'スケジュール投稿処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}