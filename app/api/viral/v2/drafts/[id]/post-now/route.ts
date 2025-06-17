import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { TwitterApi } from 'twitter-api-v2'

const prisma = new PrismaClient()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get draft with session info
    const draft = await prisma.viralDraftV2.findUnique({
      where: { id },
      include: {
        session: true
      }
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (draft.status === 'POSTED') {
      return NextResponse.json({ error: 'Already posted' }, { status: 400 })
    }

    // Twitter API credentials
    const TWITTER_CREDENTIALS = {
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!
    }
    
    const hasCredentials = !!(
      TWITTER_CREDENTIALS.appKey &&
      TWITTER_CREDENTIALS.appSecret &&
      TWITTER_CREDENTIALS.accessToken &&
      TWITTER_CREDENTIALS.accessSecret
    )
    
    if (!hasCredentials) {
      console.warn('Twitter API credentials not found in environment variables')
      return NextResponse.json(
        { error: 'Twitter API credentials not configured' },
        { status: 500 }
      )
    }
    
    // Initialize Twitter client with OAuth 1.0a
    const twitterClient = new TwitterApi(TWITTER_CREDENTIALS)

    // Get concept info from session to check format
    let conceptFormat = 'single'
    let tweetIds: string[] = []
    
    if (draft.session?.contents) {
      const contents = draft.session.contents as any[]
      const content = contents.find((c: any) => c.conceptId === draft.conceptId)
      if (content?.concept?.format) {
        conceptFormat = content.concept.format
      }
    }

    try {
      if (conceptFormat === 'thread') {
        // スレッド形式の投稿
        const tweets = draft.content.split('\n\n').filter(t => t.trim())
        let previousTweetId: string | undefined
        
        console.log(`[TWITTER POST] Posting thread with ${tweets.length} tweets`)
        
        for (let i = 0; i < tweets.length; i++) {
          const tweetText = tweets[i]
          let tweet
          
          if (previousTweetId) {
            // リプライとして投稿
            tweet = await twitterClient.v2.reply(tweetText, previousTweetId)
          } else {
            // 最初のツイート
            tweet = await twitterClient.v2.tweet(tweetText)
          }
          
          tweetIds.push(tweet.data.id)
          previousTweetId = tweet.data.id
          
          console.log(`[TWITTER POST] Tweet ${i + 1}/${tweets.length} posted: ${tweet.data.id}`)
        }
      } else {
        // シングル投稿
        console.log('[TWITTER POST] Posting single tweet')
        const tweet = await twitterClient.v2.tweet(draft.content)
        tweetIds = [tweet.data.id]
        console.log(`[TWITTER POST] Tweet posted: ${tweet.data.id}`)
      }
    } catch (twitterError: any) {
      console.error('[TWITTER POST] Error:', twitterError)
      
      if (twitterError.code === 401) {
        return NextResponse.json(
          { error: 'Twitter authentication failed. Please check API credentials.' },
          { status: 401 }
        )
      }
      
      if (twitterError.code === 403) {
        return NextResponse.json(
          { error: 'Twitter posting forbidden. Please check API permissions.' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to post to Twitter',
          message: twitterError.message || 'Unknown Twitter API error',
          code: twitterError.code
        },
        { status: 500 }
      )
    }

    // Update draft status
    await prisma.viralDraftV2.update({
      where: { id },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        tweetId: tweetIds[0] // 最初のツイートIDを保存
      }
    })

    return NextResponse.json({ 
      success: true, 
      tweetIds,
      tweetUrl: `https://twitter.com/i/web/status/${tweetIds[0]}`,
      isThread: conceptFormat === 'thread'
    })
  } catch (error) {
    console.error('Error posting draft:', error)
    return NextResponse.json({ 
      error: 'Failed to post draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}