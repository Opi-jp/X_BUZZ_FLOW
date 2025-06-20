'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Sparkles, 
  FileText, 
  Users, 
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  theme: string
  status: string
  phase: number
  currentStep: string
  createdAt: string
  concepts?: any[]
  contents?: any[]
  drafts?: any[]
}

interface Character {
  id: string
  name: string
  voiceStyle: string
  isActive: boolean
}

export function GenerationPanel() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    fetchGenerationData()
    const interval = setInterval(fetchGenerationData, 10000) // 10秒ごとに更新
    return () => clearInterval(interval)
  }, [])

  const fetchGenerationData = async () => {
    try {
      // V2システムのセッションを取得
      const [sessionsRes, charactersRes] = await Promise.all([
        fetch('/api/viral/v2/sessions?limit=10'),
        fetch('/api/create/persona/list')
      ])
      
      const sessionsData = await sessionsRes.json()
      const charactersData = await charactersRes.json()
      
      setSessions(sessionsData.sessions || [])
      setCharacters(charactersData.characters || [])
      
      // アクティブなセッションを特定
      const activeSession = sessionsData.sessions?.find(
        (s: Session) => ['COLLECTING', 'GENERATING_CONCEPTS', 'GENERATING_CONTENTS'].includes(s.status)
      )
      setActiveSessionId(activeSession?.id || null)
    } catch (error) {
      console.error('Failed to fetch generation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSessionProgress = (session: Session) => {
    const statusToProgress: Record<string, number> = {
      'CREATED': 0,
      'COLLECTING': 20,
      'TOPICS_COLLECTED': 40,
      'GENERATING_CONCEPTS': 60,
      'CONCEPTS_GENERATED': 80,
      'GENERATING_CONTENTS': 90,
      'CONTENTS_GENERATED': 95,
      'COMPLETED': 100
    }
    return statusToProgress[session.status] || 0
  }

  const getStatusInfo = (status: string) => {
    const statusInfo: Record<string, { label: string; color: string; icon: any }> = {
      'CREATED': { label: '作成済み', color: 'bg-gray-100', icon: Clock },
      'COLLECTING': { label: '情報収集中', color: 'bg-blue-100', icon: Loader2 },
      'TOPICS_COLLECTED': { label: 'トピック収集完了', color: 'bg-blue-200', icon: CheckCircle },
      'GENERATING_CONCEPTS': { label: 'コンセプト生成中', color: 'bg-purple-100', icon: Loader2 },
      'CONCEPTS_GENERATED': { label: 'コンセプト生成完了', color: 'bg-purple-200', icon: CheckCircle },
      'GENERATING_CONTENTS': { label: 'コンテンツ生成中', color: 'bg-green-100', icon: Loader2 },
      'CONTENTS_GENERATED': { label: 'コンテンツ生成完了', color: 'bg-green-200', icon: CheckCircle },
      'COMPLETED': { label: '完了', color: 'bg-green-100', icon: CheckCircle }
    }
    return statusInfo[status] || { label: status, color: 'bg-gray-100', icon: AlertCircle }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const activeSessions = sessions.filter(s => 
    ['COLLECTING', 'GENERATING_CONCEPTS', 'GENERATING_CONTENTS'].includes(s.status)
  )
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED')
  const draftSessions = sessions.filter(s => 
    ['CONCEPTS_GENERATED', 'CONTENTS_GENERATED'].includes(s.status)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Generation - コンテンツ生成</h2>
        <Link href="/viral/v2/sessions/create">
          <Button>
            <Brain className="w-4 h-4 mr-2" />
            新規セッション
          </Button>
        </Link>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            生成中のセッション
          </h3>
          {activeSessions.map((session) => {
            const statusInfo = getStatusInfo(session.status)
            const StatusIcon = statusInfo.icon
            const progress = getSessionProgress(session)

            return (
              <Card key={session.id} className="border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{session.theme}</CardTitle>
                      <CardDescription>
                        {new Date(session.createdAt).toLocaleString('ja-JP')}
                      </CardDescription>
                    </div>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className={`w-4 h-4 mr-1 ${
                        statusInfo.icon === Loader2 ? 'animate-spin' : ''
                      }`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>進行状況</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Phase {session.phase || 1} - {session.currentStep || 'Initializing'}
                    </div>
                    <Link href={`/viral/v2/sessions/${session.id}`}>
                      <Button variant="ghost" size="sm">
                        詳細を見る
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Character Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            キャラクター設定
          </CardTitle>
          <CardDescription>
            コンテンツ生成に使用するキャラクターボイス
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {characters.length > 0 ? (
              characters.map((character) => (
                <div
                  key={character.id}
                  className={`p-4 border rounded-lg ${
                    character.isActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{character.name}</h4>
                      <p className="text-sm text-gray-600">{character.voiceStyle}</p>
                    </div>
                    {character.isActive && (
                      <Badge className="bg-blue-600">アクティブ</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>キャラクターが設定されていません</p>
                <Link href="/viral/character-selector">
                  <Button className="mt-4" size="sm" variant="outline">
                    キャラクターを作成
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Draft Management */}
      {draftSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              下書き管理
            </CardTitle>
            <CardDescription>
              生成されたコンテンツの確認と編集
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draftSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{session.theme}</h4>
                      <p className="text-sm text-gray-600">
                        {session.drafts?.length || 0} 件の下書き
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/viral/v2/sessions/${session.id}/drafts`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          下書きを見る
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/viral/v2/drafts">
              <Button className="w-full mt-4" variant="outline">
                すべての下書きを管理
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Completions */}
      {completedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              最近完了したセッション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{session.theme}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(session.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <Link href={`/viral/v2/sessions/${session.id}`}>
                    <Button variant="ghost" size="sm">
                      詳細
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Alert className="bg-purple-50 border-purple-200">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <strong>ヒント:</strong> 3ステップ生成システム（Perplexity→GPT→Claude）により、
          最新トレンドを反映した高品質なコンテンツを生成できます。
          各キャラクターの個性を活かして、バリエーション豊かな投稿を作成しましょう。
        </AlertDescription>
      </Alert>
    </div>
  )
}