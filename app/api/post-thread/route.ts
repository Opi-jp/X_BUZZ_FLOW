import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// スレッド（ツリー）投稿用API
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { posts, draftId, sourceUrl } = body

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'Posts array is required' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
      console.error('Missing Twitter API credentials in environment variables')
      return NextResponse.json(
        { error: 'Twitter API configuration is incomplete. Please check environment variables.' },
        { status: 500 }
      )
    }

    // 環境変数から認証情報を取得
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    })

    // sourceUrlがある場合は別の投稿として追加
    const postsToTweet = [...posts]
    if (sourceUrl) {
      postsToTweet.push(`🔗 ${sourceUrl}`)
    }

    // モックモードのチェック
    if (process.env.USE_MOCK_POSTING === 'true') {
      const mockIds = postsToTweet.map((_, index) => `mock_${Date.now()}_${index}`)
      
      // 下書きステータス更新
      if (draftId) {
        await prisma.viralDraftV2.update({
          where: { id: draftId },
          data: {
            status: 'POSTED',
            tweetId: mockIds[0], // 最初のツイートIDを保存
            postedAt: new Date()
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        tweetIds: mockIds,
        threadUrl: `https://twitter.com/mock/status/${mockIds[0]}`,
        mock: true
      })
    }

    // 実際のスレッド投稿
    const tweetIds: string[] = []
    let lastTweetId: string | undefined = undefined

    try {
      // 各ツイートを順番に投稿
      for (const [index, postContent] of postsToTweet.entries()) {
        const tweetData: any = {
          text: postContent,
        }

        // 最初のツイート以外は返信として投稿
        if (lastTweetId) {
          tweetData.reply = {
            in_reply_to_tweet_id: lastTweetId,
          }
        }

        // ツイートを投稿
        const result = await client.v2.tweet(tweetData)
        
        if (result.data?.id) {
          tweetIds.push(result.data.id)
          lastTweetId = result.data.id

          // APIレート制限対策: 最後以外は1秒待機
          if (index < postsToTweet.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } else {
          throw new Error('Failed to get tweet ID')
        }
      }

      // 下書きステータス更新
      if (draftId) {
        await prisma.viralDraftV2.update({
          where: { id: draftId },
          data: {
            status: 'POSTED',
            tweetId: tweetIds[0], // 最初のツイートIDを保存
            postedAt: new Date()
          }
        })
      }

      const username = process.env.TWITTER_USERNAME || 'user'
      return NextResponse.json({
        success: true,
        tweetIds,
        threadUrl: `https://twitter.com/${username}/status/${tweetIds[0]}`
      })
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      
      // 部分的に投稿された場合のクリーンアップは行わない（ユーザーが手動で対処）
      
      const errorMessage = twitterError.data?.detail || twitterError.message || 'Unknown error'
      
      return NextResponse.json(
        { 
          error: 'Twitter thread posting error', 
          details: errorMessage,
          twitterCode: twitterError.code,
          partialTweetIds: tweetIds, // 部分的に投稿されたIDを返す
        },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Thread post error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to post thread',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}