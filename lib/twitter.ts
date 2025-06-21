import { TwitterApi } from 'twitter-api-v2'
import { prisma } from './prisma'

export function getTwitterClient(accessToken: string) {
  // OAuth 2.0を使用
  // アクセストークンが"Bearer "で始まる場合は除去
  const token = accessToken.startsWith('Bearer ') 
    ? accessToken.substring(7) 
    : accessToken
    
  console.log('Creating Twitter client with token:', {
    originalLength: accessToken.length,
    processedLength: token.length,
    tokenPreview: token.substring(0, 20) + '...'
  })
  
  const client = new TwitterApi(token)
  return client
}

export async function postTweet(userId: string, content: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    })

    if (!user || !user.access_token) {
      throw new Error('User not found or not authenticated')
    }

    const client = getTwitterClient(user.access_token)
    const tweet = await client.v2.tweet(content)
    return tweet
  } catch (error) {
    console.error('Error posting tweet:', error)
    throw error
  }
}

// schedulerから使用される関数
export async function postToTwitter(params: {
  content: string
  userId: string
  accessToken?: string
}) {
  try {
    if (!params.accessToken) {
      // ユーザー情報から取得
      const user = await prisma.users.findUnique({
        where: { id: params.userId },
      })
      
      if (!user || !user.access_token) {
        throw new Error('User not found or not authenticated')
      }
      
      params.accessToken = user.access_token
    }

    const client = getTwitterClient(params.accessToken)
    const tweet = await client.v2.tweet(params.content)
    return tweet
  } catch (error) {
    console.error('Error posting to Twitter:', error)
    throw error
  }
}