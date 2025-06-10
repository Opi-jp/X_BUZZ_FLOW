import { TwitterApi } from 'twitter-api-v2'
import { prisma } from './prisma'

export async function getTwitterClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.accessToken) {
    throw new Error('User not found or not authenticated')
  }

  // OAuth 2.0を使用
  const client = new TwitterApi(user.accessToken)
  return client
}

export async function postTweet(userId: string, content: string) {
  try {
    const client = await getTwitterClient(userId)
    const tweet = await client.v2.tweet(content)
    return tweet
  } catch (error) {
    console.error('Error posting tweet:', error)
    throw error
  }
}