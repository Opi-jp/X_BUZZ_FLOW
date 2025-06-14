import { redirect } from 'next/navigation'

export default function Home() {
  // 新しいダッシュボードページにリダイレクト
  redirect('/dashboard')
}