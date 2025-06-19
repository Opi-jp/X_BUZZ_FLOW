'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowRight,
  BarChart3, 
  Brain, 
  Calendar, 
  FileText, 
  Newspaper, 
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  Send
} from 'lucide-react'
import Link from 'next/link'

// Intelligence → Generation → Automation の流れを表現
export default function MissionControl() {
  const [currentStep, setCurrentStep] = useState<'intelligence' | 'generation' | 'automation' | null>(null)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentData()
  }, [])

  const fetchRecentData = async () => {
    try {
      // V2システムの最新セッションを取得
      const response = await fetch('/api/generation/content/sessions?limit=5')
      const data = await response.json()
      setRecentSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch recent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const workflowSteps = [
    {
      id: 'intelligence',
      name: 'Intelligence',
      description: '情報収集・分析',
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      actions: [
        { name: 'ニュース収集', href: '/intelligence/news', icon: Newspaper },
        { name: 'バズ分析', href: '/intelligence/buzz', icon: TrendingUp },
        { name: 'トレンド調査', href: '/intelligence/trends', icon: BarChart3 }
      ]
    },
    {
      id: 'generation',
      name: 'Generation',
      description: 'コンテンツ生成',
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      actions: [
        { name: '新規セッション', href: '/generation/content', icon: Brain },
        { name: '下書き管理', href: '/generation/drafts', icon: FileText },
        { name: 'キャラクター管理', href: '/generation/characters', icon: Users }
      ]
    },
    {
      id: 'automation',
      name: 'Automation',
      description: '自動化・投稿',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      actions: [
        { name: 'スケジューラー', href: '/generation/schedule', icon: Clock },
        { name: 'パブリッシャー', href: '/automation/publisher', icon: Send },
        { name: 'パフォーマンス', href: '/automation/analytics', icon: BarChart3 }
      ]
    }
  ]

  const getSessionStatus = (session: any) => {
    switch (session.status) {
      case 'CREATED': return { label: '作成済み', color: 'bg-gray-100' }
      case 'COLLECTING': return { label: '収集中', color: 'bg-blue-100' }
      case 'TOPICS_COLLECTED': return { label: 'トピック収集完了', color: 'bg-blue-200' }
      case 'CONCEPTS_GENERATED': return { label: 'コンセプト生成完了', color: 'bg-purple-200' }
      case 'CONTENTS_GENERATED': return { label: 'コンテンツ生成完了', color: 'bg-green-200' }
      case 'COMPLETED': return { label: '完了', color: 'bg-green-100' }
      default: return { label: session.status, color: 'bg-gray-100' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Mission Control を起動中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mission Control</h1>
              <p className="text-gray-600 mt-1">Intelligence → Generation → Automation</p>
            </div>
            <Button onClick={fetchRecentData} variant="outline" size="sm">
              🔄 更新
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ワークフロー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {workflowSteps.map((step, idx) => (
            <Card 
              key={step.id}
              className={`cursor-pointer transition-all ${
                currentStep === step.id ? 'ring-2 ring-indigo-600 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => setCurrentStep(step.id as any)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${step.bgColor}`}>
                      <step.icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                    <div>
                      <CardTitle>{step.name}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {step.actions.map((action, actionIdx) => (
                    <Link key={actionIdx} href={action.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left hover:bg-gray-100"
                        size="sm"
                      >
                        <action.icon className="w-4 h-4 mr-2" />
                        {action.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 最近のセッション */}
        <Card>
          <CardHeader>
            <CardTitle>最近のセッション</CardTitle>
            <CardDescription>
              直近の生成セッションと進行状況
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>まだセッションがありません</p>
                <Link href="/generation/content">
                  <Button className="mt-4" size="sm">
                    最初のセッションを作成
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSessions.map((session) => {
                  const status = getSessionStatus(session)
                  const progress = session.status === 'COMPLETED' ? 100 : 
                                  session.status === 'CONTENTS_GENERATED' ? 80 :
                                  session.status === 'CONCEPTS_GENERATED' ? 60 :
                                  session.status === 'TOPICS_COLLECTED' ? 40 :
                                  session.status === 'COLLECTING' ? 20 : 0
                  
                  return (
                    <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{session.theme}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.createdAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                      <Progress value={progress} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {session.drafts?.length || 0} 下書き
                        </span>
                        <Link href={`/generation/content/results/${session.id}`}>
                          <Button variant="ghost" size="sm">
                            詳細を見る
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* クイックスタート */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">🚀 クイックスタート</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800 mb-4">
                3ステップでバイラルコンテンツを生成
              </p>
              <Link href="/generation/content">
                <Button className="w-full" variant="default">
                  新規セッションを開始
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">📰 今日のトップニュース</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-800 mb-4">
                AIが選んだ重要ニュースをチェック
              </p>
              <Link href="/intelligence/news">
                <Button className="w-full" variant="outline">
                  ニュースを見る
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">📊 パフォーマンス</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-800 mb-4">
                投稿の効果を分析・最適化
              </p>
              <Link href="/automation/analytics">
                <Button className="w-full" variant="outline">
                  分析を見る
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}