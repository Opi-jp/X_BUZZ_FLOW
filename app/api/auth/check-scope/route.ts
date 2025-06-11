import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

// トークンのスコープを確認
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // ユーザー情報を取得
    const user = await prisma.user.findFirst({
      where: { 
        id: (session.user as any).id 
      }
    })
    
    if (!user?.accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 })
    }
    
    const client = new TwitterApi(user.accessToken)
    
    try {
      // 自分の情報を取得（読み取り権限の確認）
      const me = await client.v2.me()
      
      // ツイート投稿権限の確認（実際には投稿しない）
      // これは実際にツイートしないと確認できないので、スコープ情報から推測
      
      return NextResponse.json({
        success: true,
        user: {
          id: me.data.id,
          username: me.data.username,
          name: me.data.name,
        },
        permissions: {
          canRead: true, // meが取得できたら読み取り可能
          canWrite: '不明（実際に投稿してみないと確認できません）',
          note: 'ツイート投稿ができない場合は、一度ログアウトして再ログインしてください',
        },
        tokenInfo: {
          hasToken: true,
          tokenLength: user.accessToken.length,
          lastUpdated: user.updatedAt,
        }
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Twitter API error',
        details: error.message,
        code: error.code,
        suggestion: '権限が不足している可能性があります。再ログインをお試しください。'
      }, { status: 403 })
    }
  } catch (error) {
    console.error('Error checking scope:', error)
    return NextResponse.json({ error: 'Failed to check scope' }, { status: 500 })
  }
}