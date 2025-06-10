import { TwitterApi } from 'twitter-api-v2'
import { prisma } from './prisma'

export function getTwitterClient(accessToken: string) {
  // OAuth 2.0を使用
  const client = new TwitterApi(accessToken)
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