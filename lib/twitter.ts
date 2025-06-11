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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.accessToken) {
      throw new Error('User not found or not authenticated')
    }

    const client = getTwitterClient(user.accessToken)
    const tweet = await client.v2.tweet(content)
    return tweet
  } catch (error) {
    console.error('Error posting tweet:', error)
    throw error
  }
}