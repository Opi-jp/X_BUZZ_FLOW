import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    let userFromDb = null
    if (session?.user?.id) {
      userFromDb = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          username: true,
          twitterId: true,
          accessToken: true,
          createdAt: true,
          updatedAt: true
        }
      })
    }
    
    return NextResponse.json({
      session: {
        hasSession: !!session,
        user: session?.user,
        hasAccessToken: !!session?.accessToken,
        accessTokenFromSession: session?.accessToken ? 'Present' : 'Missing'
      },
      database: {
        userFound: !!userFromDb,
        hasAccessTokenInDb: !!userFromDb?.accessToken,
        username: userFromDb?.username,
        twitterId: userFromDb?.twitterId,
        createdAt: userFromDb?.createdAt,
        updatedAt: userFromDb?.updatedAt
      }
    })
  } catch (error) {
    console.error('Error in test-session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}