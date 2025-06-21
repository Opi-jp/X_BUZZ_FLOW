# フロントエンド実装第二弾 - 実装計画書

作成日: 2025年6月21日

## 🎯 概要

X_BUZZ_FLOWプロジェクトのフロントエンド実装第二弾として、16ステップの完全なフロー実装とUX/UI改善を行います。

## 📋 現状分析と課題

### 現在の実装状況
1. **バックエンド**: Create→Draft→Postフロー完全動作 ✅
2. **DB駆動型アーキテクチャ**: 確立済み ✅
3. **フロントエンド**: 基本的なフローは動作するが、UX/UI改善が必要 ⚠️
4. **CSS問題**: TailwindCSSの読み込みエラー ❌
5. **Vercelデプロイ**: 最適化未実施 ❌

### 主要な要件
1. 各ステップで情報が充実（必ずユーザーが確認できるようにする）
2. 投稿文生成の前に、スレッドにするかシングルにするかはユーザーが選べる
3. 前のステップに戻って確認できる
4. スケジューラーとの接続
5. Node.jsとTailwindのCSS読み込み問題の解決
6. Vercelデプロイへの最適化

## 🏗️ 実装計画

### Phase 1: 基盤整備（2-3日）

#### 1.1 TailwindCSS問題の解決

```typescript
// app/layout.tsx の修正
import './globals.css' // 正しいパスを確認

// tailwind.config.js の検証
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

診断と解決手順:
```bash
# PostCSSエラーの確認
npm run build

# 依存関係の再インストール
npm install -D postcss autoprefixer tailwindcss

# postcss.config.jsの作成/確認
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

#### 1.2 共通コンポーネントの作成

```typescript
// components/flow/StepIndicator.tsx
export interface Step {
  id: number
  name: string
  status: 'pending' | 'current' | 'completed' | 'error'
}

export function StepIndicator({ steps, currentStep }: {
  steps: Step[]
  currentStep: number
}) {
  return (
    <div className="flex items-center justify-center p-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <StepCircle step={step} />
          {index < steps.length - 1 && <StepConnector />}
        </div>
      ))}
    </div>
  )
}

// components/flow/StepNavigation.tsx
export function StepNavigation({ 
  canGoBack, 
  canGoNext, 
  onBack, 
  onNext 
}: NavigationProps) {
  return (
    <div className="flex justify-between mt-8">
      <Button 
        variant="outline" 
        onClick={onBack} 
        disabled={!canGoBack}
      >
        前のステップに戻る
      </Button>
      <Button 
        onClick={onNext} 
        disabled={!canGoNext}
      >
        次のステップへ
      </Button>
    </div>
  )
}

// components/flow/LoadingOverlay.tsx
export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-center text-gray-600">{message}</p>
      </div>
    </div>
  )
}
```

#### 1.3 状態管理の実装

```typescript
// lib/hooks/useFlowSession.ts
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useFlowSession(sessionId: string) {
  const [session, setSession] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  // ポーリングによるDB状態の同期
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/create/flow/${sessionId}/status`)
        const data = await res.json()
        setSession(data)
        updateCurrentStep(data)
      } catch (err) {
        setError('セッション情報の取得に失敗しました')
      }
    }
    
    fetchSession()
    const interval = setInterval(fetchSession, 2000)
    return () => clearInterval(interval)
  }, [sessionId])
  
  const updateCurrentStep = (sessionData: any) => {
    // セッション状態から現在のステップを判定
    if (!sessionData.topics) setCurrentStep(4)
    else if (!sessionData.concepts) setCurrentStep(7)
    else if (!sessionData.selectedConcepts?.length) setCurrentStep(9)
    else if (!sessionData.contents) setCurrentStep(11)
    else setCurrentStep(15)
  }
  
  const goToStep = (step: number) => {
    // 戻る場合のみ許可（DB駆動型なので進むは自動）
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }
  
  return {
    session,
    currentStep,
    loading,
    error,
    goToStep
  }
}
```

### Phase 2: フロー実装（3-4日）

#### 2.1 ステップ1-3: 入力画面

```typescript
// app/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export default function CreatePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    theme: '',
    platform: 'Twitter',
    style: 'エンターテイメント'
  })
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/create/flow/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const session = await res.json()
      router.push(`/create/flow/${session.id}`)
    } catch (error) {
      console.error('セッション作成エラー:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>新しいコンテンツを作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                テーマ
              </label>
              <Input
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
                placeholder="例: AIによる社会変革の未来"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                プラットフォーム
              </label>
              <Select
                value={formData.platform}
                onChange={(value) => setFormData({...formData, platform: value})}
              >
                <option value="Twitter">Twitter</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Facebook">Facebook</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                スタイル
              </label>
              <Select
                value={formData.style}
                onChange={(value) => setFormData({...formData, style: value})}
              >
                <option value="エンターテイメント">エンターテイメント</option>
                <option value="教育的">教育的</option>
                <option value="ニュース">ニュース</option>
                <option value="ビジネス">ビジネス</option>
              </Select>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '作成中...' : 'コンテンツ作成を開始'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 2.2 ステップ4-6: Perplexity処理

```typescript
// app/create/flow/[id]/components/TopicsDisplay.tsx
interface Topic {
  title: string
  url: string
  source: string
  summary: string
  date?: string
}

export function TopicsDisplay({ 
  topics, 
  onNext 
}: { 
  topics: Topic[]
  onNext: () => void 
}) {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">収集されたトピック</h3>
        <p className="text-gray-600">
          Perplexityが収集した最新の関連情報です
        </p>
      </div>
      
      <div className="grid gap-4">
        {topics.map((topic, index) => (
          <TopicCard key={topic.url} topic={topic} index={index} />
        ))}
      </div>
      
      <div className="flex justify-end mt-8">
        <Button onClick={onNext} size="lg">
          コンセプト生成へ進む
        </Button>
      </div>
    </div>
  )
}

function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-1">{topic.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{topic.summary}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{topic.source}</span>
              {topic.date && <span>{topic.date}</span>}
              <a 
                href={topic.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                詳細を見る →
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 2.3 ステップ7-10: GPTコンセプト生成

```typescript
// app/create/flow/[id]/components/ConceptSelector.tsx
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function ConceptSelector({ 
  concepts, 
  onGenerate 
}: { 
  concepts: any[]
  onGenerate: (selectedIds: string[], format: 'single' | 'thread') => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [format, setFormat] = useState<'single' | 'thread'>('single')
  
  const toggleConcept = (conceptId: string) => {
    setSelected(prev => {
      if (prev.includes(conceptId)) {
        return prev.filter(id => id !== conceptId)
      }
      if (prev.length >= 3) {
        alert('最大3つまで選択できます')
        return prev
      }
      return [...prev, conceptId]
    })
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">投稿形式を選択</h3>
        <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="single" />
              <span>シングル投稿</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="thread" />
              <span>スレッド投稿（5投稿）</span>
            </label>
          </div>
        </RadioGroup>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">
          コンセプトを選択（最大3つ）
        </h3>
        <p className="text-gray-600 mb-4">
          生成されたコンセプトから、投稿文を作成したいものを選択してください
        </p>
        
        <div className="grid gap-4">
          {concepts.map(concept => (
            <ConceptCard
              key={concept.conceptId}
              concept={concept}
              isSelected={selected.includes(concept.conceptId)}
              onToggle={() => toggleConcept(concept.conceptId)}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-end mt-8">
        <Button 
          onClick={() => onGenerate(selected, format)}
          disabled={selected.length === 0}
          size="lg"
        >
          投稿文を生成（{selected.length}/3）
        </Button>
      </div>
    </div>
  )
}

function ConceptCard({ concept, isSelected, onToggle }) {
  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-600' : ''
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="mt-1"
          />
          <div className="flex-1">
            <h4 className="font-medium mb-2">{concept.conceptTitle}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>フック: {concept.selectedHook}</p>
              <p>角度: {concept.selectedAngle}</p>
              <p>バイラルスコア: {concept.viralScore}/100</p>
            </div>
            <div className="mt-3 text-sm">
              <p className="font-medium mb-1">構成:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• {concept.structure.openingHook}</li>
                <li>• {concept.structure.mainContent}</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 2.4 ステップ11-14: Claude投稿生成

```typescript
// app/create/flow/[id]/components/ContentPreview.tsx
export function ContentPreview({ 
  contents,
  onSaveDraft
}: { 
  contents: any[]
  onSaveDraft: () => void
}) {
  const [selectedContent, setSelectedContent] = useState(contents[0])
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">生成された投稿文</h3>
        <p className="text-gray-600">
          キャラクター: {selectedContent.characterId}
        </p>
      </div>
      
      {/* コンテンツタブ */}
      {contents.length > 1 && (
        <div className="flex gap-2 border-b">
          {contents.map((content, index) => (
            <button
              key={content.conceptId}
              className={`px-4 py-2 border-b-2 transition-colors ${
                selectedContent.conceptId === content.conceptId
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent'
              }`}
              onClick={() => setSelectedContent(content)}
            >
              コンセプト {index + 1}
            </button>
          ))}
        </div>
      )}
      
      {/* 投稿プレビュー */}
      <div className="space-y-4">
        {selectedContent.format === 'thread' ? (
          <ThreadPreview posts={selectedContent.posts} />
        ) : (
          <SinglePostPreview content={selectedContent.content} />
        )}
      </div>
      
      <div className="flex justify-end mt-8">
        <Button onClick={onSaveDraft} size="lg">
          下書きとして保存
        </Button>
      </div>
    </div>
  )
}

function ThreadPreview({ posts }: { posts: string[] }) {
  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">
                  投稿 {index + 1}/5
                </div>
                <p className="whitespace-pre-wrap">{post}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SinglePostPreview({ content }: { content: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <p className="whitespace-pre-wrap">{content}</p>
            <div className="mt-3 text-sm text-gray-500">
              文字数: {content.length}文字
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 2.5 ステップ15-16: 下書き確認

```typescript
// app/drafts/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DraftEditor } from './components/DraftEditor'
import { SchedulerModal } from './components/SchedulerModal'

export default function DraftPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const [draft, setDraft] = useState(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    fetchDraft()
  }, [params.id])
  
  const fetchDraft = async () => {
    const res = await fetch(`/api/drafts/${params.id}`)
    const data = await res.json()
    setDraft(data)
  }
  
  const handlePublishNow = async () => {
    const res = await fetch('/api/publish/post/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: draft.id })
    })
    
    if (res.ok) {
      const result = await res.json()
      router.push(`/published/${result.id}`)
    }
  }
  
  const handleSchedule = async (schedule: any) => {
    await fetch(`/api/drafts/${draft.id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    })
    
    setShowScheduler(false)
    router.push('/scheduled')
  }
  
  if (!draft) return <div>読み込み中...</div>
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <DraftEditor
        draft={draft}
        onUpdate={fetchDraft}
      />
      
      <div className="flex gap-4 mt-8">
        <Button 
          onClick={handlePublishNow}
          className="flex-1"
        >
          今すぐ投稿
        </Button>
        <Button 
          onClick={() => setShowScheduler(true)}
          variant="outline"
          className="flex-1"
        >
          スケジュール設定
        </Button>
      </div>
      
      {showScheduler && (
        <SchedulerModal
          draftId={draft.id}
          onSchedule={handleSchedule}
          onClose={() => setShowScheduler(false)}
        />
      )}
    </div>
  )
}
```

### Phase 3: UX強化（2-3日）

#### 3.1 進行状況の可視化

```typescript
// app/create/flow/[id]/page.tsx
'use client'

import { useFlowSession } from '@/lib/hooks/useFlowSession'
import { StepIndicator } from '@/components/flow/StepIndicator'
import { StepNavigation } from '@/components/flow/StepNavigation'
import { LoadingOverlay } from '@/components/flow/LoadingOverlay'

const FLOW_STEPS = [
  { id: 1, name: 'テーマ入力' },
  { id: 2, name: 'DB保存' },
  { id: 3, name: 'プロンプト準備' },
  { id: 4, name: 'Perplexity実行' },
  { id: 5, name: 'トピック保存' },
  { id: 6, name: 'トピック表示' },
  { id: 7, name: 'GPT準備' },
  { id: 8, name: 'コンセプト生成' },
  { id: 9, name: 'コンセプト保存' },
  { id: 10, name: 'コンセプト選択' },
  { id: 11, name: 'Claude準備' },
  { id: 12, name: '投稿文生成' },
  { id: 13, name: '投稿文保存' },
  { id: 14, name: '投稿文表示' },
  { id: 15, name: '下書き作成' },
  { id: 16, name: '下書き確認' },
]

export default function FlowPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { 
    session, 
    currentStep, 
    loading, 
    error, 
    goToStep 
  } = useFlowSession(params.id)
  
  const steps = FLOW_STEPS.map((step, index) => ({
    ...step,
    status: index + 1 < currentStep ? 'completed' :
            index + 1 === currentStep ? 'current' :
            'pending'
  }))
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">
            コンテンツ作成フロー
          </h1>
          {session && (
            <p className="text-gray-600 mt-1">
              テーマ: {session.theme}
            </p>
          )}
        </div>
      </div>
      
      {/* ステップインジケーター */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 overflow-x-auto">
          <StepIndicator 
            steps={steps} 
            currentStep={currentStep} 
          />
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {loading && (
          <LoadingOverlay message={getLoadingMessage(currentStep)} />
        )}
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderStepContent(currentStep, session)}
        </div>
        
        <StepNavigation
          canGoBack={currentStep > 6}
          canGoNext={false} // DB駆動型なので自動進行
          onBack={() => goToStep(currentStep - 1)}
          onNext={() => {}}
        />
      </div>
    </div>
  )
}

function getLoadingMessage(step: number): string {
  if (step <= 6) return 'トピックを収集しています...'
  if (step <= 10) return 'コンセプトを生成しています...'
  if (step <= 14) return '投稿文を作成しています...'
  return '処理中...'
}

function renderStepContent(step: number, session: any) {
  // 各ステップに応じたコンポーネントを表示
  switch(step) {
    case 6:
      return <TopicsDisplay topics={session?.topics || []} />
    case 10:
      return <ConceptSelector concepts={session?.concepts || []} />
    case 14:
      return <ContentPreview contents={session?.contents || []} />
    default:
      return <div>処理中...</div>
  }
}
```

#### 3.2 エラーリカバリー

```typescript
// lib/hooks/useErrorRecovery.ts
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function useErrorRecovery(sessionId: string) {
  const [retrying, setRetrying] = useState(false)
  const router = useRouter()
  
  const handleError = async (error: any) => {
    console.error('Flow error:', error)
    
    // エラーをスマート記録システムに送信
    await fetch('/api/errors/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        sessionId,
        context: 'flow-execution'
      })
    })
  }
  
  const retryOperation = async (
    operation: () => Promise<any>
  ): Promise<any> => {
    setRetrying(true)
    
    try {
      // セッション状態を確認
      const statusRes = await fetch(`/api/create/flow/${sessionId}/status`)
      const status = await statusRes.json()
      
      if (status.error) {
        throw new Error(status.error)
      }
      
      // 操作を再試行
      const result = await operation()
      return result
    } catch (error) {
      await handleError(error)
      
      // リカバリーオプションを提示
      const shouldRecover = confirm(
        'エラーが発生しました。セッションを復旧しますか？'
      )
      
      if (shouldRecover) {
        const recoveryRes = await fetch(
          `/api/create/flow/${sessionId}/recover`,
          { method: 'POST' }
        )
        
        if (recoveryRes.ok) {
          // 復旧成功
          window.location.reload()
        } else {
          // 新しいセッションを作成
          router.push('/create')
        }
      }
      
      throw error
    } finally {
      setRetrying(false)
    }
  }
  
  return {
    retrying,
    retryOperation,
    handleError
  }
}
```

#### 3.3 リアルタイム更新

```typescript
// lib/hooks/useRealtimeProgress.ts
import { useEffect, useState } from 'react'

export function useRealtimeProgress(sessionId: string) {
  const [progress, setProgress] = useState({
    step: '',
    percentage: 0,
    message: ''
  })
  
  useEffect(() => {
    // Server-Sent Events による進行状況更新
    const eventSource = new EventSource(
      `/api/create/flow/${sessionId}/events`
    )
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data)
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      eventSource.close()
    }
    
    return () => {
      eventSource.close()
    }
  }, [sessionId])
  
  return progress
}

// API側の実装
// app/api/create/flow/[id]/events/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      }
      
      // 進行状況を監視
      const interval = setInterval(async () => {
        const session = await prisma.viral_sessions.findUnique({
          where: { id: params.id }
        })
        
        if (session) {
          sendEvent({
            step: session.status,
            percentage: calculateProgress(session),
            message: getProgressMessage(session)
          })
        }
      }, 1000)
      
      // クリーンアップ
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

### Phase 4: 統合とデプロイ（2日）

#### 4.1 スケジューラー統合

```typescript
// app/drafts/[id]/components/SchedulerModal.tsx
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { TimePicker } from '@/components/ui/time-picker'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

export function SchedulerModal({ 
  draftId, 
  onSchedule, 
  onClose 
}: {
  draftId: string
  onSchedule: (schedule: any) => void
  onClose: () => void
}) {
  const [schedule, setSchedule] = useState({
    date: new Date(),
    time: '19:00',
    timezone: 'Asia/Tokyo',
    repeat: 'none',
    repeatInterval: 1,
    repeatCount: 1
  })
  
  const handleSchedule = async () => {
    const scheduledAt = new Date(schedule.date)
    const [hours, minutes] = schedule.time.split(':')
    scheduledAt.setHours(parseInt(hours), parseInt(minutes))
    
    const scheduleData = {
      draftId,
      scheduledAt: scheduledAt.toISOString(),
      timezone: schedule.timezone,
      repeat: schedule.repeat,
      repeatInterval: schedule.repeatInterval,
      repeatCount: schedule.repeatCount
    }
    
    await onSchedule(scheduleData)
  }
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <h2 className="text-xl font-semibold">投稿をスケジュール</h2>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 日付選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              投稿日
            </label>
            <Calendar
              selected={schedule.date}
              onSelect={(date) => setSchedule({...schedule, date})}
              minDate={new Date()}
            />
          </div>
          
          {/* 時刻選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              投稿時刻
            </label>
            <TimePicker
              value={schedule.time}
              onChange={(time) => setSchedule({...schedule, time})}
            />
          </div>
          
          {/* 繰り返し設定 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              繰り返し
            </label>
            <Select
              value={schedule.repeat}
              onChange={(value) => setSchedule({...schedule, repeat: value})}
            >
              <option value="none">なし</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
            </Select>
          </div>
          
          {schedule.repeat !== 'none' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  間隔
                </label>
                <input
                  type="number"
                  min="1"
                  value={schedule.repeatInterval}
                  onChange={(e) => setSchedule({
                    ...schedule, 
                    repeatInterval: parseInt(e.target.value)
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  回数
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={schedule.repeatCount}
                  onChange={(e) => setSchedule({
                    ...schedule, 
                    repeatCount: parseInt(e.target.value)
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </>
          )}
          
          {/* アクションボタン */}
          <div className="flex gap-4">
            <Button 
              onClick={handleSchedule}
              className="flex-1"
            >
              スケジュール設定
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### 4.2 Vercel最適化

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 画像最適化
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // スタンドアロン出力
  output: 'standalone',
  
  // SWC最適化
  swcMinify: true,
  
  // 実験的機能
  experimental: {
    // App Routerの最適化
    optimizePackageImports: ['@/components', '@/lib'],
    
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Webpack設定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントバンドルの最適化
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  
  // リダイレクト設定
  async redirects() {
    return [
      {
        source: '/',
        destination: '/create',
        permanent: false,
      },
    ]
  },
  
  // ヘッダー設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

```json
// vercel.json
{
  "functions": {
    "app/api/create/flow/[id]/process/route.ts": {
      "maxDuration": 60
    },
    "app/api/publish/post/now/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "framework": "nextjs",
  "installCommand": "npm install --production=false",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

## 📊 技術的解決策

### CSS読み込み問題の診断と解決

```bash
# 1. 診断
npm run build
# エラーメッセージを確認

# 2. 依存関係の確認
npm ls tailwindcss postcss autoprefixer

# 3. 設定ファイルの検証
cat postcss.config.js
cat tailwind.config.js

# 4. グローバルCSSの確認
cat app/globals.css

# 5. クリーンインストール
rm -rf node_modules package-lock.json
npm install
npm install -D tailwindcss postcss autoprefixer

# 6. 設定の再生成
npx tailwindcss init -p
```

### パフォーマンス最適化

```typescript
// コンポーネントの遅延読み込み
const DraftEditor = dynamic(
  () => import('./components/DraftEditor'),
  { 
    loading: () => <p>読み込み中...</p>,
    ssr: false 
  }
)

// APIレスポンスのキャッシュ
export const revalidate = 60 // 60秒キャッシュ

// 画像の最適化
import Image from 'next/image'

<Image
  src="/profile.jpg"
  width={40}
  height={40}
  alt="Profile"
  loading="lazy"
  placeholder="blur"
/>
```

## 🚀 実装優先順位

### Week 1: 基盤とコアフロー
- [ ] TailwindCSS問題の解決
- [ ] 共通コンポーネントの作成
- [ ] 状態管理フックの実装
- [ ] 基本的な16ステップフローの実装

### Week 2: UX/UI改善
- [ ] スレッド/シングル選択UI
- [ ] 前のステップに戻る機能
- [ ] エラーハンドリングとリカバリー
- [ ] リアルタイム進行状況表示

### Week 3: 統合と最適化
- [ ] スケジューラー統合
- [ ] パフォーマンス最適化
- [ ] Vercelデプロイ設定
- [ ] E2Eテストの実装

## 📝 実装チェックリスト

### 基盤整備
- [ ] TailwindCSS設定の修正
- [ ] PostCSS設定の確認
- [ ] globals.cssのインポート確認
- [ ] 共通コンポーネントの作成
- [ ] 状態管理フックの実装

### フロー実装
- [ ] 入力画面（ステップ1-3）
- [ ] Perplexity処理画面（ステップ4-6）
- [ ] GPTコンセプト選択（ステップ7-10）
- [ ] Claude投稿生成（ステップ11-14）
- [ ] 下書き確認（ステップ15-16）

### UX機能
- [ ] ステップインジケーター
- [ ] ナビゲーション（前後移動）
- [ ] ローディング表示
- [ ] エラーハンドリング
- [ ] リアルタイム更新

### 統合機能
- [ ] スケジューラーモーダル
- [ ] 繰り返し投稿設定
- [ ] タイムゾーン対応
- [ ] 投稿履歴表示

### デプロイ最適化
- [ ] next.config.js設定
- [ ] vercel.json設定
- [ ] 環境変数設定
- [ ] ビルド最適化

## 🎯 成功基準

1. **ユーザビリティ**: 各ステップで何が起きているか明確に分かる
2. **信頼性**: エラー時もデータが失われない
3. **パフォーマンス**: 各ステップの遷移が高速
4. **拡張性**: 新しい機能を追加しやすい構造
5. **保守性**: コードが整理され、ドキュメント化されている

---

この計画に従って実装を進めることで、ユーザーフレンドリーで堅牢なフロントエンドシステムを構築できます。