import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// 現在のトークンを無効化して再ログインを促す
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // ユーザーのトークンをクリア
    if ((session.user as any).id) {
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: {
          accessToken: '',
          refreshToken: null,
        }
      })
    }
    
    return NextResponse.json({ success: true, message: 'トークンを無効化しました。再度ログインしてください。' })
  } catch (error) {
    console.error('Error revoking token:', error)
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  }
}