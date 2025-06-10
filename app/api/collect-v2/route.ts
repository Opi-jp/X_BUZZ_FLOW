import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Twitter API v2を使ったバズ投稿収集
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
    const { query, maxResults = 10 } = body

    // Twitter API v2クライアントを初期化
    const twitterClient = new TwitterApi(session.accessToken)
    const client = twitterClient.v2

    // ツイートを検索（最近の人気ツイート）
    const tweets = await client.search(query, {
      max_results: Math.min(maxResults, 100),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'id', 'text'],
      'user.fields': ['name', 'username', 'profile_image_url'],
      expansions: ['author_id'],
      sort_order: 'relevancy', // 関連性順（エンゲージメントも考慮）
    })

    // データベースに保存
    const savedPosts = []
    const users = new Map(tweets.includes?.users?.map(u => [u.id, u]) || [])

    for (const tweet of tweets.data || []) {
      try {
        const metrics = tweet.public_metrics
        const author = users.get(tweet.author_id || '')
        
        // エンゲージメントが高いツイートのみ保存
        if (metrics && (metrics.like_count >= 100 || metrics.retweet_count >= 20)) {
          const existingPost = await prisma.buzzPost.findUnique({
            where: { postId: tweet.id },
          })

          if (!existingPost) {
            const post = await prisma.buzzPost.create({
              data: {
                postId: tweet.id,
                content: tweet.text || '',
                authorUsername: author?.username || '',
                authorId: tweet.author_id || '',
                likesCount: metrics.like_count || 0,
                retweetsCount: metrics.retweet_count || 0,
                repliesCount: metrics.reply_count || 0,
                impressionsCount: metrics.impression_count || 0,
                postedAt: new Date(tweet.created_at || Date.now()),
                url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
                theme: query,
                language: 'ja',
                mediaUrls: [],
                hashtags: [],
              },
            })
            savedPosts.push(post)
          }
        }
      } catch (error) {
        console.error('Error saving tweet:', error)
      }
    }

    return NextResponse.json({
      collected: tweets.data?.length || 0,
      saved: savedPosts.length,
      posts: savedPosts,
      message: `Twitter API v2で${savedPosts.length}件のバズ投稿を収集しました`
    })
  } catch (error) {
    console.error('Error collecting posts:', error)
    
    // Twitter APIのレート制限エラーをチェック
    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        { error: 'Twitter APIのレート制限に達しました。15分後に再試行してください。' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to collect posts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}