'use client'

import { useState } from 'react'

export default function ViralDashboard() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [executedSteps, setExecutedSteps] = useState<Set<string>>(new Set())

  const runWorkflow = async () => {
    console.log('runWorkflow called')
    setLoading(true)
    setError(null)

    try {
      let data
      
      if (executedSteps.has('trends')) {
        // ステップ1が完了している場合：投稿生成のみ実行
        if (!result?.opportunities || result.opportunities.length === 0) {
          throw new Error('トレンド分析結果が見つかりません')
        }
        
        const generateResponse = await fetch('/api/viral/generate-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunityIds: result.opportunities.slice(0, 3).map((o: any) => o.id)
          })
        })
        
        if (!generateResponse.ok) {
          throw new Error(`投稿生成エラー: ${generateResponse.status}`)
        }
        
        const generateData = await generateResponse.json()
        data = {
          ...result,
          posts: generateData.posts,
          apiSource: 'generate-posts-only'
        }
      } else {
        // フルワークフロー実行
        const response = await fetch('/api/viral/workflow/auto-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expertise: 'AI × 働き方、25年のクリエイティブ経験',
            platform: 'Twitter',
            style: '解説 × エンタメ',
            minViralScore: 0.7,
            maxOpportunities: 3,
            autoSchedule: false
          })
        })

        if (!response.ok) {
          throw new Error(`エラー: ${response.status}`)
        }

        data = await response.json()
      }

      setResult(data)
      setExecutedSteps(prev => new Set([...prev, 'workflow']))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const analyzeTrends = async () => {
    console.log('analyzeTrends called')
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/viral/analyze-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRefresh: true
        })
      })

      if (!response.ok) {
        throw new Error(`エラー: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
      setExecutedSteps(prev => new Set([...prev, 'trends']))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const resetSteps = () => {
    setResult(null)
    setError(null)
    setExecutedSteps(new Set())
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">バイラルコンテンツ自動生成システム</h1>

      <div className="mb-4">
        <button
          onClick={resetSteps}
          className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
        >
          リセット
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={analyzeTrends}
          disabled={loading || executedSteps.has('trends')}
          className={`px-6 py-3 rounded-lg ${
            executedSteps.has('trends')
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {executedSteps.has('trends') 
            ? '✓ 完了: ステップ1' 
            : loading 
            ? '分析中...' 
            : 'ステップ1: トレンド分析のみ (ChatGPT)'
          }
        </button>

        <button
          onClick={runWorkflow}
          disabled={loading || executedSteps.has('workflow')}
          className={`px-6 py-3 rounded-lg ${
            executedSteps.has('workflow')
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : loading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : executedSteps.has('trends')
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {executedSteps.has('workflow')
            ? '✓ 完了: 全ステップ'
            : loading 
            ? '待機中...' 
            : executedSteps.has('trends')
            ? 'ステップ2: 投稿生成のみ (Claude)'
            : 'ステップ1+2: 分析＋投稿生成 (ChatGPT→Claude)'
          }
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            結果
            {result.apiSource && <span className="text-xs bg-gray-200 px-2 py-1 rounded ml-2">{result.apiSource}</span>}
            {result.workflow && <span className="text-sm text-green-600 ml-2">（ワークフロー実行）</span>}
            {!result.workflow && result.opportunities && <span className="text-sm text-blue-600 ml-2">（トレンド分析のみ）</span>}
          </h2>
          
          {result.opportunities && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">バズ機会</h3>
              {result.opportunities.map((opp: any, index: number) => (
                <div key={opp.id || index} className="bg-white p-4 rounded mb-2">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{opp.topic}</h4>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      スコア: {(opp.viralScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{opp.angle}</p>
                  <div className="flex flex-wrap gap-1">
                    {opp.keywords?.map((keyword: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    投稿推奨時間: {opp.timeWindow}時間以内
                  </p>
                </div>
              ))}
            </div>
          )}

          {result.posts && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">生成された投稿</h3>
              {result.posts.map((post: any, index: number) => (
                <div key={post.id || index} className="bg-white p-4 rounded mb-2">
                  <div className="mb-2">
                    <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {post.conceptType}
                    </span>
                    <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded ml-2">
                      {post.postType}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{post.content}</p>
                  {post.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="text-sm text-blue-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.workflow && (
            <div className="text-sm text-gray-600">
              <p>分析した機会: {result.workflow.opportunitiesAnalyzed}件</p>
              <p>選択した機会: {result.workflow.opportunitiesSelected}件</p>
              <p>生成した投稿: {result.workflow.postsGenerated}件</p>
            </div>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500">
              生データを表示
            </summary>
            <pre className="mt-2 text-xs bg-gray-200 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}