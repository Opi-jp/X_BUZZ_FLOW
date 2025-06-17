'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DataItem {
  id: string
  type: 'topic' | 'concept' | 'news' | 'source'
  title: string
  description?: string
  metadata: any
  createdAt: string
  performance?: {
    score: number
    impressions?: number
    engagement?: number
  }
}

export default function DataExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('7d')
  const [items, setItems] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [draggedItem, setDraggedItem] = useState<DataItem | null>(null)
  
  useEffect(() => {
    fetchData()
  }, [filterType, dateRange, searchQuery])
  
  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: filterType,
        range: dateRange
      })
      
      const response = await fetch(`/api/viral/v2/data/explore?${params}`)
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDragStart = (e: React.DragEvent, item: DataItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'copy'
  }
  
  const handleDragEnd = () => {
    setDraggedItem(null)
  }
  
  const handleCreateSession = async () => {
    if (selectedItems.length === 0) {
      alert('データを選択してください')
      return
    }
    
    const selectedData = items.filter(item => selectedItems.includes(item.id))
    
    try {
      const response = await fetch('/api/viral/v2/sessions/create-from-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataItems: selectedData,
          theme: searchQuery || 'AI関連'
        })
      })
      
      if (response.ok) {
        const { sessionId } = await response.json()
        window.location.href = `/viral/v2/sessions/${sessionId}`
      } else {
        alert('セッション作成に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'topic': return '💡'
      case 'concept': return '🎯'
      case 'news': return '📰'
      case 'source': return '🔗'
      default: return '📄'
    }
  }
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'topic': return 'bg-blue-100 text-blue-700'
      case 'concept': return 'bg-purple-100 text-purple-700'
      case 'news': return 'bg-green-100 text-green-700'
      case 'source': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">データエクスプローラー</h1>
          <p className="text-gray-600">
            過去のトピック、コンセプト、ニュースを検索・再利用
          </p>
        </div>
        
        {/* フィルターバー */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div className="md:col-span-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="キーワードで検索..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            {/* タイプフィルター */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">すべてのタイプ</option>
                <option value="topic">トピック</option>
                <option value="concept">コンセプト</option>
                <option value="news">ニュース</option>
                <option value="source">ソース</option>
              </select>
            </div>
            
            {/* 期間フィルター */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1d">過去24時間</option>
                <option value="7d">過去7日間</option>
                <option value="30d">過去30日間</option>
                <option value="all">すべて</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* アクションバー */}
        {selectedItems.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-indigo-700">
                {selectedItems.length}件のデータを選択中
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => setSelectedItems([])}
                  className="px-4 py-2 text-sm border border-indigo-300 rounded-lg hover:bg-indigo-100"
                >
                  選択解除
                </button>
                <button
                  onClick={handleCreateSession}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  新規セッション作成
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* データグリッド */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-lg shadow p-4 cursor-move hover:shadow-lg transition-shadow ${
                  selectedItems.includes(item.id) ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => {
                  if (selectedItems.includes(item.id)) {
                    setSelectedItems(selectedItems.filter(id => id !== item.id))
                  } else {
                    setSelectedItems([...selectedItems, item.id])
                  }
                }}
              >
                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTypeIcon(item.type)}</span>
                    <span className={`text-xs px-2 py-1 rounded ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </div>
                  {item.performance && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">スコア</div>
                      <div className="text-sm font-medium">
                        {item.performance.score.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* コンテンツ */}
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {item.description}
                  </p>
                )}
                
                {/* メタデータ */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {format(new Date(item.createdAt), 'MM/dd HH:mm', { locale: ja })}
                  </span>
                  {item.performance && (
                    <div className="flex items-center space-x-3">
                      {item.performance.impressions && (
                        <span>👁 {item.performance.impressions.toLocaleString()}</span>
                      )}
                      {item.performance.engagement && (
                        <span>💬 {item.performance.engagement.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* ドラッグターゲット */}
        <div
          className="fixed bottom-8 right-8 bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-gray-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (draggedItem) {
              alert(`"${draggedItem.title}" をドロップしました！`)
            }
          }}
        >
          <div className="text-center">
            <span className="text-3xl mb-2 block">🎯</span>
            <p className="text-sm text-gray-600">
              ここにドラッグして<br />新規セッション作成
            </p>
          </div>
        </div>
        
        {/* ヒント */}
        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">データが見つかりませんでした</p>
            <p className="text-sm text-gray-400">
              検索条件を変更するか、新しいセッションを作成してください
            </p>
          </div>
        )}
      </div>
    </div>
  )
}