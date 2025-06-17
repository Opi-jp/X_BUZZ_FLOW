'use client'

import { useState, useEffect } from 'react'

type DataType = 'topics' | 'concepts' | 'drafts'

export default function DataViewerPage() {
  const [dataType, setDataType] = useState<DataType>('topics')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('')

  useEffect(() => {
    fetchData()
  }, [dataType, theme])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (theme) params.append('theme', theme)
      params.append('limit', '50')
      
      const response = await fetch(`/api/viral/v2/data/${dataType}?${params}`)
      const result = await response.json()
      
      setData(result[dataType] || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderTopicItem = (topic: any) => (
    <div key={`${topic.sessionId}-${topic.TOPIC}`} className="bg-white p-4 rounded shadow mb-2">
      <h4 className="font-semibold">{topic.TOPIC}</h4>
      <p className="text-sm text-gray-600 mt-1">{topic.summary}</p>
      <div className="mt-2 text-xs text-gray-500">
        <span className="mr-4">テーマ: {topic.sessionTheme}</span>
        <span className="mr-4">日付: {topic.date}</span>
        <a href={topic.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          ソース
        </a>
      </div>
    </div>
  )

  const renderConceptItem = (concept: any) => (
    <div key={`${concept.sessionId}-${concept.conceptId}`} className="bg-white p-4 rounded shadow mb-2">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold">{concept.structure?.openingHook || concept.hook}</h4>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{concept.format}</span>
      </div>
      <p className="text-sm text-gray-600">角度: {concept.angle}</p>
      <div className="mt-2 text-xs text-gray-500">
        <span className="mr-4">テーマ: {concept.sessionTheme}</span>
        <span className="mr-4">トピック: {concept.topicTitle}</span>
      </div>
    </div>
  )

  const renderDraftItem = (draft: any) => (
    <div key={draft.id} className="bg-white p-4 rounded shadow mb-2">
      <p className="text-sm">{draft.content}</p>
      <div className="mt-2">
        {draft.hashtags?.map((tag: string, i: number) => (
          <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        <span className="mr-4">テーマ: {draft.session?.theme}</span>
        <span className="mr-4">キャラクター: {draft.characterId}</span>
        <span className="mr-4">文字数: {draft.content.replace(/\n/g, '').length}</span>
      </div>
      {draft.sourceUrl && (
        <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
          引用元
        </a>
      )}
    </div>
  )

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">データビューア</h1>
      
      {/* コントロール */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">データタイプ</label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as DataType)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="topics">トピック</option>
              <option value="concepts">コンセプト</option>
              <option value="drafts">下書き</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">テーマでフィルタ</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例: AIと働き方"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="pt-6">
            <button
              onClick={fetchData}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              更新
            </button>
          </div>
        </div>
      </div>

      {/* データ表示 */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {data.length}件のデータ
            </div>
            
            <div className="space-y-2">
              {dataType === 'topics' && data.map(renderTopicItem)}
              {dataType === 'concepts' && data.map(renderConceptItem)}
              {dataType === 'drafts' && data.map(renderDraftItem)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}