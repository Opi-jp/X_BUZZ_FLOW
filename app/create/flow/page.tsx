'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CreateFlowIndexPage() {
  const router = useRouter()
  
  useEffect(() => {
    // 新規フロー作成ページへリダイレクト
    router.push('/create/flow/new')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">フロー作成</h1>
        <p className="text-gray-600">リダイレクト中...</p>
      </div>
    </div>
  )
}