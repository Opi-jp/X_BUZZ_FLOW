/**
 * Twitterスレッド投稿機能
 * 複数のツイートを連続して投稿し、ツリー構造を作成
 */

import { TwitterApi } from 'twitter-api-v2'

export interface ThreadResult {
  threadId: string  // 最初のツイートID
  tweetIds: string[]  // 全ツイートID
  url: string  // スレッドのURL
}

/**
 * 遅延関数（レート制限対策）
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Twitterクライアントの作成
 */
function createTwitterClient(): TwitterApi {
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
      !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
    throw new Error('Twitter API credentials are not configured')
  }
  
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  })
}

/**
 * スレッド形式で複数のツイートを投稿
 */
export async function postThread(
  tweets: string[],
  options?: {
    delayMs?: number  // ツイート間の遅延（デフォルト: 1000ms）
    mockMode?: boolean  // モックモード
  }
): Promise<ThreadResult> {
  const { delayMs = 1000, mockMode = process.env.USE_MOCK_POSTING === 'true' } = options || {}
  
  if (tweets.length === 0) {
    throw new Error('No tweets to post')
  }
  
  // モックモード
  if (mockMode) {
    console.log('🎭 Mock mode: スレッド投稿をシミュレート')
    const mockIds = tweets.map((_, index) => `mock_${Date.now()}_${index}`)
    return {
      threadId: mockIds[0],
      tweetIds: mockIds,
      url: `https://twitter.com/mock/status/${mockIds[0]}`
    }
  }
  
  const client = createTwitterClient()
  const rwClient = client.readWrite
  const tweetIds: string[] = []
  
  try {
    // 1. 最初のツイートを投稿
    console.log('📤 投稿 1/', tweets.length)
    const firstTweet = await rwClient.v2.tweet(tweets[0])
    tweetIds.push(firstTweet.data.id)
    console.log('✅ 投稿成功:', firstTweet.data.id)
    
    // 2. 返信として続きを投稿
    for (let i = 1; i < tweets.length; i++) {
      // レート制限対策の遅延
      await delay(delayMs)
      
      console.log(`📤 投稿 ${i + 1}/${tweets.length} (返信)`)
      
      const reply = await rwClient.v2.tweet({
        text: tweets[i],
        reply: {
          in_reply_to_tweet_id: tweetIds[tweetIds.length - 1]
        }
      })
      
      tweetIds.push(reply.data.id)
      console.log('✅ 投稿成功:', reply.data.id)
    }
    
    // 成功結果を返す
    return {
      threadId: tweetIds[0],
      tweetIds,
      url: `https://twitter.com/user/status/${tweetIds[0]}`
    }
    
  } catch (error) {
    console.error('❌ スレッド投稿エラー:', error)
    
    // 部分的に成功している場合の情報を含める
    if (tweetIds.length > 0) {
      console.log(`⚠️ ${tweetIds.length}/${tweets.length} 件の投稿に成功`)
      
      // エラーを再スローしつつ、成功した分の情報も保持
      const partialError = new Error(`Thread posting partially failed: ${tweetIds.length}/${tweets.length} tweets posted`)
      ;(partialError as any).partialResult = {
        threadId: tweetIds[0],
        tweetIds,
        url: `https://twitter.com/user/status/${tweetIds[0]}`
      }
      throw partialError
    }
    
    throw error
  }
}

/**
 * 単一ツイートを投稿（既存機能との互換性）
 */
export async function postSingleTweet(
  text: string,
  options?: {
    mockMode?: boolean
  }
): Promise<{
  id: string
  url: string
}> {
  const result = await postThread([text], options)
  
  return {
    id: result.threadId,
    url: result.url
  }
}