'use client'

import Link from 'next/link'
import { Brain, Plus, FileText, Users, Zap } from 'lucide-react'

export default function CreateOverviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <Brain className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create - コンテンツ生成
          </h1>
          <p className="text-xl text-gray-600">
            AI駆動の3段階生成フローでバイラルコンテンツを作成
          </p>
        </div>

        {/* 生成フロー説明 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔄 3段階生成フロー
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Intel - 情報収集</h3>
              <p className="text-gray-600 text-sm">
                Perplexityで最新トピックを収集・分析
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Concepts - 企画</h3>
              <p className="text-gray-600 text-sm">
                GPT-4oでバイラルコンセプトを複数生成
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate - 生成</h3>
              <p className="text-gray-600 text-sm">
                Claudeでキャラクター投稿文を作成
              </p>
            </div>
          </div>
        </div>

        {/* アクションカード */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/create/new" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent group-hover:border-purple-200">
              <div className="flex items-center mb-4">
                <Plus className="w-8 h-8 text-purple-600 mr-3" />
                <h3 className="text-xl font-semibold">新規作成</h3>
              </div>
              <p className="text-gray-600 mb-4">
                テーマを入力して新しいバイラルコンテンツを生成開始
              </p>
              <div className="text-purple-600 font-medium group-hover:text-purple-700">
                開始する →
              </div>
            </div>
          </Link>

          <Link href="/create/flow" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent group-hover:border-blue-200">
              <div className="flex items-center mb-4">
                <Zap className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold">進行中フロー</h3>
              </div>
              <p className="text-gray-600 mb-4">
                実行中の生成フローを確認・管理
              </p>
              <div className="text-blue-600 font-medium group-hover:text-blue-700">
                確認する →
              </div>
            </div>
          </Link>

          <Link href="/drafts" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent group-hover:border-green-200">
              <div className="flex items-center mb-4">
                <FileText className="w-8 h-8 text-green-600 mr-3" />
                <h3 className="text-xl font-semibold">下書き管理</h3>
              </div>
              <p className="text-gray-600 mb-4">
                生成済みの下書きを編集・投稿
              </p>
              <div className="text-green-600 font-medium group-hover:text-green-700">
                管理する →
              </div>
            </div>
          </Link>
        </div>

        {/* 統計情報（モック） */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Create統計</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">42</div>
              <div className="text-gray-600">今月の生成数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">89%</div>
              <div className="text-gray-600">成功率</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">3.2</div>
              <div className="text-gray-600">平均バイラルスコア</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">15</div>
              <div className="text-gray-600">下書き数</div>
            </div>
          </div>
        </div>

        {/* ナビゲーション */}
        <div className="mt-12 flex justify-center gap-6">
          <Link 
            href="/hub" 
            className="text-gray-600 hover:text-gray-700 font-medium"
          >
            ← ハブに戻る
          </Link>
          <Link 
            href="/publish" 
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            投稿管理 →
          </Link>
        </div>
      </div>
    </div>
  )
}