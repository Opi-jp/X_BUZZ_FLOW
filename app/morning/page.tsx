'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface RPCandidate {
  id: string
  author: string
  content: string
  likesCount: number
  url: string
  aiSuggestion: string
  score: number
}

interface OriginalPost {
  id: string
  time: string
  content: string
  type: string
}

export default function MorningPage() {
  const [loading, setLoading] = useState(true)
  const [briefing, setBriefing] = useState<any>(null)
  const [rpCandidates, setRpCandidates] = useState<RPCandidate[]>([])
  const [originalPosts, setOriginalPosts] = useState<OriginalPost[]>([])
  const [selectedRPs, setSelectedRPs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMorningBriefing()
  }, [])

  const loadMorningBriefing = async () => {
    setLoading(true)
    try {
      // まずバズ投稿を収集（バッチ収集を使用）
      const collectRes = await fetch('/api/batch-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (collectRes.ok) {
        const collectData = await collectRes.json()
        console.log('収集完了:', collectData.summary)
      }
      
      // 統合ブリーフィングを取得
      const res = await fetch('/api/briefing/morning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includePerplexity: true,
          includeNews: true,
          includeBuzz: true,
          timeRange: '24h'
        })
      })

      if (res.ok) {
        const data = await res.json()
        setBriefing(data.briefing)
        
        // RP候補を整形
        if (data.briefing.actionableItems) {
          const rpItems = data.briefing.actionableItems
            .filter((item: any) => item.type === 'urgent_rp')
            .map((item: any) => ({
              id: item.url || Math.random().toString(),
              author: item.details?.match(/@(\w+)/)?.[1] || 'unknown',
              content: item.details || '',
              likesCount: parseInt(item.details?.match(/(\d+)いいね/)?.[1]?.replace(/,/g, '') || '0'),
              url: item.url || '#',
              aiSuggestion: '50代の経験から見ると、この流れは1990年代のCG革命を思い出させます。',
              score: 95
            }))
          setRpCandidates(rpItems.slice(0, 3))
        }

        // オリジナル投稿案を生成
        setOriginalPosts([
          {
            id: '1',
            time: '10:00',
            content: '23年前、CGが仕事を奪うと言われた。でも実際は新しい職種が生まれた。今のAIブームも同じかもしれない。歴史は繰り返すが、経験者だけが見える景色がある。',
            type: 'experience'
          },
          {
            id: '2',
            time: '19:00',
            content: 'AIツール統合に悩む人へ。効率化を追求しすぎると創造性が死ぬ。あえて「手作業」を残すことで、新しい発見が生まれる。これが23年の映像制作で学んだ真実。',
            type: 'contrarian'
          }
        ])
      }
    } catch (error) {
      console.error('Morning briefing error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRPSelect = (id: string) => {
    setSelectedRPs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const completePreparation = async () => {
    // 選択したRPと承認した投稿を保存
    alert(`準備完了！\n\nRP予定: ${selectedRPs.size}件\nオリジナル投稿: ${originalPosts.length}件\n\n今日も頑張りましょう！`)
    // TODO: スケジュール登録API呼び出し
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">☀️</div>
          <p className="text-xl">朝の準備を読み込み中...</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'おはようございます' : 'こんにちは'
  const dateStr = now.toLocaleDateString('ja-JP', { 
    month: 'numeric', 
    day: 'numeric', 
    weekday: 'short' 
  })
  const timeStr = now.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          ☀️ {greeting}、大屋さん
        </h1>
        <p className="text-gray-600">
          {dateStr} {timeStr}
        </p>
      </div>

      {/* Perplexity統合分析サマリー */}
      {briefing?.perplexityInsights && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-3">📊 Perplexity統合分析（5:00実行済み）</h2>
          <div className="bg-white p-4 rounded">
            <p className="text-lg font-medium mb-2">
              🔥 今日の注目トレンド
            </p>
            {briefing.perplexityInsights.structuredInsights?.trends?.[0] && (
              <p className="text-gray-700">
                「{briefing.perplexityInsights.structuredInsights.trends[0]}」が
                あなたの1990年代CG革命の経験と重なります
              </p>
            )}
          </div>
        </div>
      )}

      {/* RP候補 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">🎯 今すぐRPすべき投稿（3選）</h2>
        <div className="space-y-4">
          {rpCandidates.map((candidate) => (
            <div 
              key={candidate.id}
              className={`border rounded-lg p-4 transition-all ${
                selectedRPs.has(candidate.id) 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">@{candidate.author}</p>
                  <p className="text-sm text-gray-700 mt-1">{candidate.content}</p>
                  <div className="mt-3 p-3 bg-yellow-50 rounded">
                    <p className="text-sm font-medium">💬 あなたの逆張り案：</p>
                    <p className="text-sm text-gray-700 mt-1">{candidate.aiSuggestion}</p>
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => handleRPSelect(candidate.id)}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      selectedRPs.has(candidate.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {selectedRPs.has(candidate.id) ? '✓ 選択済み' : 'RP作成'}
                  </button>
                  <a
                    href={candidate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700 text-center"
                  >
                    元投稿を見る
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* オリジナル投稿 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">📝 オリジナル投稿（自動生成済み）</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {originalPosts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {post.time} 投稿予定
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {post.type === 'experience' ? '経験談' : '逆張り'}
                </span>
              </div>
              <p className="text-sm">{post.content}</p>
              <button className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                編集する
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 完了ボタン */}
      <div className="flex justify-center">
        <button
          onClick={completePreparation}
          disabled={selectedRPs.size === 0}
          className={`px-8 py-4 rounded-lg font-medium text-lg transition-all ${
            selectedRPs.size > 0
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          ✅ 準備完了！今日も頑張りましょう
        </button>
      </div>

      {/* サマリー */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          本日の投稿予定：RP {selectedRPs.size}件 + オリジナル {originalPosts.length}件 = 
          <span className="font-bold"> 計{selectedRPs.size + originalPosts.length}件</span>
        </p>
      </div>
    </div>
  )
}