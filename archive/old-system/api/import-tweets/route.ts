import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザー情報を取得
    const user = await prisma.user.findFirst({
      where: { username: session.user.name || '' }
    })

    if (!user || !user.accessToken) {
      return NextResponse.json({ error: 'User not found or no access token' }, { status: 404 })
    }

    // Twitter APIクライアントを初期化
    const client = new TwitterApi(user.accessToken)

    // 自分のツイートを取得（最新100件）
    const tweets = await client.v2.userTimeline(user.twitterId, {
      max_results: 100,
      'tweet.fields': ['created_at', 'public_metrics', 'entities'],
      exclude: ['retweets', 'replies']
    })

    let importedCount = 0

    for (const tweet of tweets.data.data || []) {
      try {
        // 既存の投稿をチェック
        const existing = await prisma.scheduledPost.findFirst({
          where: { 
            content: tweet.text,
            postedAt: { not: null }
          }
        })

        if (!existing && tweet.public_metrics) {
          // scheduled_postsテーブルに投稿として保存
          const post = await prisma.scheduledPost.create({
            data: {
              content: tweet.text,
              scheduledTime: new Date(tweet.created_at || Date.now()),
              status: 'POSTED',
              postType: 'NEW',
              aiGenerated: false,
              postedAt: new Date(tweet.created_at || Date.now()),
              postResult: {
                tweetId: tweet.id,
                url: `https://twitter.com/${user.username}/status/${tweet.id}`
              }
            }
          })

          // 分析データも作成
          await prisma.postAnalytics.create({
            data: {
              scheduledPostId: post.id,
              impressions: tweet.public_metrics.impression_count || 0,
              likes: tweet.public_metrics.like_count || 0,
              retweets: tweet.public_metrics.retweet_count || 0,
              replies: tweet.public_metrics.reply_count || 0,
              profileClicks: 0,
              linkClicks: 0,
              engagementRate: tweet.public_metrics.impression_count > 0 
                ? ((tweet.public_metrics.like_count + tweet.public_metrics.retweet_count) / tweet.public_metrics.impression_count) * 100
                : 0,
              measuredAt: new Date()
            }
          })

          importedCount++
        }
      } catch (error) {
        console.error('Error importing tweet:', error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      importedCount,
      message: `${importedCount}件のツイートをインポートしました`
    })
  } catch (error) {
    console.error('Error importing tweets:', error)
    return NextResponse.json(
      { error: 'Failed to import tweets' },
      { status: 500 }
    )
  }
}