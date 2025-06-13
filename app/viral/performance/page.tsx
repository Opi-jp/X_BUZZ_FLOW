'use client'

import AppLayout from '@/app/components/layout/AppLayout'
import PostPerformance from '@/app/components/analytics/PostPerformance'
import { TrendingUp } from 'lucide-react'

export default function ViralPerformancePage() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-8 h-8 mr-3 text-blue-500" />
          パフォーマンス分析
        </h1>
        <p className="mt-2 text-gray-600">
          あなたの投稿のパフォーマンスを分析し、改善提案を提供します
        </p>
      </div>

      <PostPerformance />
    </AppLayout>
  )
}