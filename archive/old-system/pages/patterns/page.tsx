'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'

interface AIPattern {
  id: string
  name: string
  description: string
  promptTemplate: string
  exampleOutput: string
  successRate: number
  usageCount: number
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<AIPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promptTemplate: '',
    exampleOutput: '',
  })

  useEffect(() => {
    fetchPatterns()
  }, [])

  const fetchPatterns = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-patterns')
      const data = await res.json()
      setPatterns(data)
    } catch (error) {
      console.error('Error fetching patterns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/ai-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData({
          name: '',
          description: '',
          promptTemplate: '',
          exampleOutput: '',
        })
        setShowForm(false)
        fetchPatterns()
      }
    } catch (error) {
      console.error('Error creating pattern:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AIパターン管理</h1>
              <p className="mt-1 text-sm text-gray-600">
                AI生成用のパターンを管理します
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showForm ? 'キャンセル' : '新規作成'}
            </button>
          </div>

          {/* 新規作成フォーム */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">新規パターン作成</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パターン名
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プロンプトテンプレート
                  </label>
                  <textarea
                    value={formData.promptTemplate}
                    onChange={(e) => setFormData({ ...formData, promptTemplate: e.target.value })}
                    rows={4}
                    placeholder="{{content}}で元の内容を参照できます"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    出力例
                  </label>
                  <textarea
                    value={formData.exampleOutput}
                    onChange={(e) => setFormData({ ...formData, exampleOutput: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  作成
                </button>
              </div>
            </form>
          )}

          {/* パターン一覧 */}
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : patterns.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">パターンがまだありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {patterns.map((pattern) => (
                <div key={pattern.id} className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{pattern.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">プロンプト:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                        {pattern.promptTemplate}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">出力例:</p>
                      <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded mt-1">
                        {pattern.exampleOutput}
                      </p>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-500 pt-3 border-t">
                      <span>使用回数: {pattern.usageCount}</span>
                      <span>成功率: {pattern.successRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}