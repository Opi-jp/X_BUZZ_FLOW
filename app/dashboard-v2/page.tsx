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
}

interface BatchCollectionSummary {
  totalCollected: number
  totalDuplicates: number
  successfulPresets: number
  totalPresets: number
  collectionTime: string
}

interface HighlightedPost {
  id: string
  content: string
  authorUsername: string
  likesCount: number
  url: string
}

export default function DashboardV2Page() {
  const [loading, setLoading] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [rpCandidates, setRpCandidates] = useState<RPCandidate[]>([])
  const [collectionSummary, setCollectionSummary] = useState<BatchCollectionSummary | null>(null)
  const [newsHighlights, setNewsHighlights] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<string[]>([])
  const [briefingData, setBriefingData] = useState<any>(null)

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
      
      // トレンドトピックスを取得（Perplexity統合後に実装）
      // await fetchTrendingTopics()
      
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
          url: post.url
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

  const runBatchCollection = async () => {
    setCollecting(true)
    try {
      // 統合ブリーフィングを実行
      const briefingRes = await fetch('/api/briefing/morning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includePerplexity: true,
          includeNews: true,
          includeBuzz: true
        })
      })
      
      if (briefingRes.ok) {
        const briefingData = await briefingRes.json()
        console.log('Briefing data:', briefingData)
        
        // ブリーフィングデータを保存
        setBriefingData(briefingData.briefing)
        
        // Perplexityの結果を表示
        if (briefingData.briefing?.perplexityInsights) {
          const trends = briefingData.briefing.perplexityInsights.structuredInsights?.trends || []
          const personalAngles = briefingData.briefing.perplexityInsights.personalAngles || []
          
          alert(`📊 朝のAI秘書ブリーフィング完了！\n\n🔥 今日のトレンド:\n${trends.slice(0, 3).join('\n')}\n\n💡 あなたの独自視点:\n${personalAngles.slice(0, 2).map(a => a.angle).join('\n')}\n\n詳細は画面下部に表示されています。`)
        }
        
        // バッチ収集も実行
        const res = await fetch('/api/batch-collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (res.ok) {
          const data = await res.json()
          setCollectionSummary(data.summary)
          setRpCandidates(data.analysis.rpCandidates || [])
        }
      } else {
        alert('ブリーフィング中にエラーが発生しました')
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
          customPrompt: `以下の投稿に対して、50代クリエイティブディレクターの視点から価値のある引用RTを作成してください。AIとホワイトカラー代替の観点を含めて、140文字以内で。\n\n@${candidate.author}の投稿:\n${candidate.content}`
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-8">ダッシュボードを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🤖 朝のAI秘書</h1>
        <p className="mt-2 text-gray-600">あなたの23年の経験 × AI で、若者には見えない独自視点を発見</p>
      </div>

      {/* アクションボタン */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={runBatchCollection}
          disabled={collecting}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium"
        >
          {collecting ? 'AI分析中...' : '🚀 ワンクリック朝の準備（Perplexity統合）'}
        </button>
        
        <button
          onClick={async () => {
            // Perplexityトレンド分析を実行
            const res = await fetch('/api/perplexity/trends', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: 'AI クリエイティブ 働き方 最新トレンド 今日',
                focus: 'creative_ai_trends'
              })
            })
            if (res.ok) {
              const data = await res.json()
              alert(`今日のトレンド分析完了:\n\n${data.structuredInsights.trends?.slice(0, 3).join('\n') || 'データ取得中'}`)
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 font-medium"
        >
          🔥 今すぐPerplexityで先取り
        </button>
        
        <Link
          href="/news"
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          📰 ニュース管理
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
                        エンゲージメント率: {candidate.engagementRate}
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
                    {article.source} - 重要度: {(article.importance * 100).toFixed(0)}%
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
            <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              投稿作成
            </button>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">昼の投稿（12-13時）</h3>
            <p className="text-sm text-gray-700">
              「50代から始めるAI活用」
              - 世代特有の強みを活かす
              - 経験×AIの価値
            </p>
            <button className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
              投稿作成
            </button>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">夜の投稿（21-23時）</h3>
            <p className="text-sm text-gray-700">
              「ホワイトカラーの未来」
              - 深い洞察系コンテンツ
              - 議論を呼ぶ問題提起
            </p>
            <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
              投稿作成
            </button>
          </div>
        </div>
      </div>

      {/* Perplexityブリーフィング結果 */}
      {briefingData && (
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-purple-800">🤖 AI秘書ブリーフィング結果</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Perplexityトレンド */}
            {briefingData.perplexityInsights && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-blue-800">🔥 Perplexity最新トレンド</h3>
                <div className="space-y-2">
                  {briefingData.perplexityInsights.structuredInsights?.trends?.slice(0, 5).map((trend: string, i: number) => (
                    <div key={i} className="p-2 bg-blue-50 rounded text-sm">
                      {i + 1}. {trend}
                    </div>
                  ))}
                </div>
                
                {briefingData.perplexityInsights.personalAngles && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-purple-800 mb-2">💡 あなたの独自視点</h4>
                    <div className="space-y-2">
                      {briefingData.perplexityInsights.personalAngles.map((angle: any, i: number) => (
                        <div key={i} className="p-3 bg-purple-50 rounded">
                          <div className="font-medium text-sm">{angle.angle}</div>
                          <div className="text-xs text-gray-600 mt-1">{angle.hook}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* アクション提案 */}
            {briefingData.actionableItems && briefingData.actionableItems.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-red-800">🎯 今すぐやるべきこと</h3>
                <div className="space-y-3">
                  {briefingData.actionableItems.slice(0, 5).map((action: any, i: number) => (
                    <div key={i} className={`p-3 rounded border-l-4 ${
                      action.priority === 'high' ? 'bg-red-50 border-red-500' : 
                      action.priority === 'medium' ? 'bg-yellow-50 border-yellow-500' : 
                      'bg-gray-50 border-gray-500'
                    }`}>
                      <div className="font-medium text-sm">{action.action}</div>
                      <div className="text-xs text-gray-600 mt-1">{action.details}</div>
                      <div className="text-xs text-gray-500 mt-1">⏰ {action.timeframe}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* パーソナライズされた要点 */}
          {briefingData.personalizedTakeaways && briefingData.personalizedTakeaways.length > 0 && (
            <div className="mt-6 bg-white rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 text-green-800">🎨 あなただけの戦略</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {briefingData.personalizedTakeaways.map((takeaway: any, i: number) => (
                  <div key={i} className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">{takeaway.title}</h4>
                    <ul className="text-xs space-y-1">
                      {takeaway.points.map((point: string, j: number) => (
                        <li key={j} className="text-gray-700">• {point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
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