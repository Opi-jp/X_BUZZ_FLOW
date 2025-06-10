import { redirect } from 'next/navigation'

export default function Home() {
  try {
    redirect('/dashboard')
  } catch (error) {
    // リダイレクトエラーをキャッチ
    return null
  }
}