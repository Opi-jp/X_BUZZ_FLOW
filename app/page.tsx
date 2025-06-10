import { redirect } from 'next/navigation'

export default function Home() {
  // ホームページアクセス時は自動的にダッシュボードへリダイレクト
  redirect('/dashboard')
}