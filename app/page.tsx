import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    // 未認証の場合はサインインページへ
    redirect('/auth/signin')
  }
  
  // 認証済みの場合は新しいダッシュボードページにリダイレクト
  redirect('/dashboard')
}