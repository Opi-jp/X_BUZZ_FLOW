import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export { authOptions }

export interface AuthUser {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

/**
 * 現在のセッションを取得
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions)
}

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession()
  if (!session?.user) {
    return null
  }

  // For now, return user info from session
  // In production, you'd need to look up the user by twitterId
  return {
    id: session.user.id || 'session-user',
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  }
}

/**
 * 認証が必要なAPIルートで使用
 */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Twitter認証情報の取得
 */
export async function getTwitterCredentials() {
  const session = await getCurrentSession() as any
  
  if (!session?.accessToken) {
    throw new Error('Twitter credentials not found')
  }

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  }
}