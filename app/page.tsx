import { redirect } from 'next/navigation'

export default function Home() {
  // GPTバイラルシステムをトップページにリダイレクト
  redirect('/viral/gpt')
}