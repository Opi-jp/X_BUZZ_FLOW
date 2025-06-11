'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTimeJST } from '@/lib/date-utils'

interface RPCandidate {
  id: string
  author: string
  followers: number
  content: string
  engagementRate: string
  url: string
  likesCount: number
  retweetsCount: number
  impressionsCount: number
  postedAt: string
}

interface BatchCollectionSummary {
  totalCollected: number
  totalDuplicates: number
  successfulPresets: number
  totalPresets: number
  collectionTime: string
}

interface OriginalPost {
  id: string
  time: string
  content: string
  type: string
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [briefing, setBriefing] = useState<any>(null)
  const [rpCandidates, setRpCandidates] = useState<RPCandidate[]>([])
  const [collectionSummary, setCollectionSummary] = useState<BatchCollectionSummary | null>(null)
  const [originalPosts, setOriginalPosts] = useState<OriginalPost[]>([])
  const [selectedRPs, setSelectedRPs] = useState<Set<string>>(new Set())
  const [newsHighlights, setNewsHighlights] = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // 最新のRP候補を取得
      await fetchRPCandidates()
      
      // 重要ニュースを取得
      await fetchNewsHighlights()
      
      // ブリーフィングを取得
      await loadBriefing()
      
    } catch (error) {
      console.error('Dashboard loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRPCandidates = async () => {
    try {
      const res = await fetch('/api/buzz-posts?limit=50')
      const data = await res.json()
      
      // 自動スコアリングしてRP候補を抽出
      const candidates = data.posts
        .filter((post: any) => {
          const engagementRate = post.impressionsCount > 0 
            ? ((post.likesCount + post.retweetsCount) / post.impressionsCount) * 100 
            : 0
          
          return (
            engagementRate > 5 &&
            post.authorFollowers > 50000 &&
            new Date(post.postedAt).getTime() > Date.now() - 6 * 60 * 60 * 1000
          )
        })
        .slice(0, 5)
        .map((post: any) => ({
          id: post.id,
          author: post.authorUsername,
          followers: post.authorFollowers,
          content: post.content.substring(0, 100) + '...',
          engagementRate: post.impressionsCount > 0 
            ? ((post.likesCount + post.retweetsCount) / post.impressionsCount * 100).toFixed(2) + '%'
            : 'N/A',
          url: post.url,
          likesCount: post.likesCount,
          retweetsCount: post.retweetsCount,
          impressionsCount: post.impressionsCount,
          postedAt: post.postedAt
        }))
      
      setRpCandidates(candidates)
    } catch (error) {
      console.error('Error fetching RP candidates:', error)
    }
  }

  const fetchNewsHighlights = async () => {
    try {
      const res = await fetch('/api/news/articles?analyzed=true&limit=5')
      if (res.ok) {
        const data = await res.json()
        setNewsHighlights(data.articles.filter((a: any) => a.importance >= 0.7))
      }
    } catch (error) {
      console.error('Error fetching news:', error)
    }
  }

  const loadBriefing = async () => {
    try {
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
      console.error('Briefing error:', error)
    }
  }

  const runBatchCollection = async () => {
    setCollecting(true)
    try {
      // バッチ収集を実行
      const res = await fetch('/api/batch-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        const data = await res.json()
        setCollectionSummary(data.summary)
        setRpCandidates(data.analysis.rpCandidates || [])
        
        // ブリーフィングも更新
        await loadBriefing()
        
        alert(`収集完了！\n\n新規: ${data.summary.totalCollected}件\n重複: ${data.summary.totalDuplicates}件`)
      } else {
        alert('収集処理に失敗しました')
      }
    } catch (error) {
      console.error('Batch collection error:', error)
      alert('収集処理に失敗しました')
    } finally {
      setCollecting(false)
    }
  }

  const generateRPContent = async (candidate: RPCandidate) => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPrompt: `以下の投稿に対して、50代クリエイティブディレクターの視点から価値のある引用RTを作成してください。AIとホワイトカラー代替の観点を含めて、140文字以内で。\n\n@${candidate.author}の投稿：\n${candidate.content}`
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        // スケジュール画面に遷移
        window.location.href = `/schedule?content=${encodeURIComponent(data.generatedContent)}&action=rp&targetUrl=${encodeURIComponent(candidate.url)}`
      }
    } catch (error) {
      console.error('Error generating RP content:', error)
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
    alert(`準備完了！\n\nRP予定: ${selectedRPs.size}件\nオリジナル投稿: ${originalPosts.length}件\n\n今日も頑張りましょう！`)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-8">読み込み中...</div>
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">☀️ {greeting}、大屋さん</h1>
        <p className="mt-2 text-gray-600">{dateStr} {timeStr}</p>
      </div>

      {/* アクションボタン */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={runBatchCollection}
          disabled={collecting}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium"
        >
          {collecting ? 'AI分析中...' : '🚀 ワンクリック朝の準備（全自動収集＋分析）'}
        </button>
        
        <Link
          href="/news"
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          📰 ニュース管理
        </Link>
        
        <Link
          href="/collect"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          🔍 手動収集
        </Link>
      </div>

      {/* 収集結果サマリー */}
      {collectionSummary && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">最新収集結果</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600">新規収集:</span> {collectionSummary.totalCollected}件
            </div>
            <div>
              <span className="text-blue-600">重複:</span> {collectionSummary.totalDuplicates}件
            </div>
            <div>
              <span className="text-blue-600">成功プリセット:</span> {collectionSummary.successfulPresets}/{collectionSummary.totalPresets}
            </div>
            <div>
              <span className="text-blue-600">実行時刻:</span> {formatDateTimeJST(collectionSummary.collectionTime)}
            </div>
          </div>
        </div>
      )}

      {/* Perplexity統合分析 */}
      {briefing?.perplexityInsights && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <h2 className="text-xl font-bold mb-3">📊 Perplexity統合分析</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded">
              <h3 className="font-semibold mb-2">🔥 今日のトレンド</h3>
              {briefing.perplexityInsights.structuredInsights?.trends?.slice(0, 3).map((trend: string, i: number) => (
                <div key={i} className="text-sm mb-1">• {trend}</div>
              ))}
            </div>
            {briefing.perplexityInsights.personalAngles && (
              <div className="bg-white p-4 rounded">
                <h3 className="font-semibold mb-2">💡 あなたの独自視点</h3>
                {briefing.perplexityInsights.personalAngles.slice(0, 2).map((angle: any, i: number) => (
                  <div key={i} className="text-sm mb-1">• {angle.angle}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* RP必須案件 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-red-600">🔥 RP必須案件（TOP 5）</h2>
          
          {rpCandidates.length === 0 ? (
            <p className="text-gray-500">現在RP候補はありません。自動収集を実行してください。</p>
          ) : (
            <div className="space-y-4">
              {rpCandidates.map((candidate, index) => (
                <div key={candidate.id} className="border-l-4 border-red-500 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {index + 1}. @{candidate.author}
                        <span className="ml-2 text-sm text-gray-600">
                          ({(candidate.followers / 10000).toFixed(1)}万フォロワー)
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{candidate.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        エンゲージメント率: {candidate.engagementRate} | 
                        {candidate.likesCount.toLocaleString()}いいね
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => generateRPContent(candidate)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        RP作成
                      </button>
                      <a
                        href={candidate.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 text-center"
                      >
                        元投稿
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 重要ニュース */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-600">📰 重要ニュース</h2>
          
          {newsHighlights.length === 0 ? (
            <p className="text-gray-500">重要なニュースはありません</p>
          ) : (
            <div className="space-y-4">
              {newsHighlights.map((article, index) => (
                <div key={article.id} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-sm">{article.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    ソース: {article.source?.name || '不明'} - 重要度: {((article.importance || 0) * 100).toFixed(0)}%
                  </p>
                  {article.summary && (
                    <p className="text-xs text-gray-700 mt-2">{article.summary}</p>
                  )}
                  <Link
                    href={`/news/threads?articleIds=${article.id}`}
                    className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    スレッド作成 →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 投稿提案 */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-green-600">💡 今日の投稿提案</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">朝の投稿（7-9時）</h3>
            <p className="text-sm text-gray-700">
              「AIツールで朝の1時間を効率化する方法」
              - 実践的なTips共有
              - 具体的なツール紹介
            </p>
            <Link href="/create" className="mt-3 inline-block px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              投稿作成
            </Link>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">昼の投稿（12-13時）</h3>
            <p className="text-sm text-gray-700">
              「50代から始めるAI活用」
              - 世代特有の強みを活かす
              - 経験×AIの価値
            </p>
            <Link href="/create" className="mt-3 inline-block px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
              投稿作成
            </Link>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">夜の投稿（21-23時）</h3>
            <p className="text-sm text-gray-700">
              「ホワイトカラーの未来」
              - 深い洞察系コンテンツ
              - 議論を呼ぶ問題提起
            </p>
            <Link href="/create" className="mt-3 inline-block px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
              投稿作成
            </Link>
          </div>
        </div>
      </div>
      
      {/* クイックアクション */}
      <div className="mt-8 p-6 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-4">⚡ クイックアクション</h3>
        <div className="flex gap-4">
          <Link
            href="/posts"
            className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            投稿一覧を見る
          </Link>
          <Link
            href="/analytics"
            className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            分析レポート
          </Link>
          <Link
            href="/patterns"
            className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            AIパターン管理
          </Link>
        </div>
      </div>
    </div>
  )
}