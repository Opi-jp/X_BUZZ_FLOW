'use client'

import Link from 'next/link'
import { Brain, Zap, Send, BarChart3, TrendingUp, FileText } from 'lucide-react'

export default function HubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            X_BUZZ_FLOW Hub
          </h1>
          <p className="text-xl text-gray-600">
            AI駆動のバイラルコンテンツ生成プラットフォーム
          </p>
        </div>

        {/* モジュール群 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Intel モジュール */}
          <Link href="/intel" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent group-hover:border-blue-200 group-hover:scale-105">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-10 h-10 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Intel</h3>
                  <p className="text-sm text-gray-500">情報収集・分析</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• News: ニュース収集</div>
                <div>• Social: SNS分析</div>
                <div>• Trends: トレンド検出</div>
              </div>
              <div className="mt-4 text-blue-600 font-medium group-hover:text-blue-700">
                開く →
              </div>
            </div>
          </Link>

          {/* Create モジュール */}
          <Link href="/create" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent group-hover:border-purple-200 group-hover:scale-105">
              <div className="flex items-center mb-4">
                <Brain className="w-10 h-10 text-purple-600 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create</h3>
                  <p className="text-sm text-gray-500">コンテンツ生成</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Flow: 3段階生成</div>
                <div>• Draft: 下書き管理</div>
                <div>• Persona: キャラクター</div>
              </div>
              <div className="mt-4 text-purple-600 font-medium group-hover:text-purple-700">
                開く →
              </div>
            </div>
          </Link>

          {/* Publish モジュール */}
          <Link href="/publish" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent group-hover:border-green-200 group-hover:scale-105">
              <div className="flex items-center mb-4">
                <Send className="w-10 h-10 text-green-600 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Publish</h3>
                  <p className="text-sm text-gray-500">配信管理</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Post: 即時投稿</div>
                <div>• Schedule: スケジュール</div>
                <div>• Track: 追跡</div>
              </div>
              <div className="mt-4 text-green-600 font-medium group-hover:text-green-700">
                開く →
              </div>
            </div>
          </Link>

          {/* Analyze モジュール */}
          <Link href="/analyze" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent group-hover:border-orange-200 group-hover:scale-105">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-10 h-10 text-orange-600 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Analyze</h3>
                  <p className="text-sm text-gray-500">分析・改善</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Metrics: メトリクス</div>
                <div>• Report: レポート</div>
                <div>• Predict: 予測分析</div>
              </div>
              <div className="mt-4 text-orange-600 font-medium group-hover:text-orange-700">
                開く →
              </div>
            </div>
          </Link>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚡ クイックアクション</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link 
              href="/create/new" 
              className="bg-purple-100 hover:bg-purple-200 p-4 rounded-lg transition-colors text-center"
            >
              <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="font-medium">新規生成</div>
            </Link>
            <Link 
              href="/drafts" 
              className="bg-blue-100 hover:bg-blue-200 p-4 rounded-lg transition-colors text-center"
            >
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="font-medium">下書き確認</div>
            </Link>
            <Link 
              href="/publish" 
              className="bg-green-100 hover:bg-green-200 p-4 rounded-lg transition-colors text-center"
            >
              <Send className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="font-medium">即時投稿</div>
            </Link>
          </div>
        </div>

        {/* システム状態（モック） */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔄 システム状態</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              <div className="font-medium">APIs</div>
              <div className="text-sm text-gray-600">正常</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              <div className="font-medium">Database</div>
              <div className="text-sm text-gray-600">接続中</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              <div className="font-medium">AI Services</div>
              <div className="text-sm text-gray-600">利用可能</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div className="font-medium">Queue</div>
              <div className="text-sm text-gray-600">3件処理中</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}