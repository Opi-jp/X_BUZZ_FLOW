'use client'

import { useState } from 'react'
import AppLayout from '@/app/components/layout/AppLayout'
import { Settings, Save, AlertCircle, Plus, X } from 'lucide-react'

interface BuzzConfig {
  keywords: string[]
  accounts: string[]
  minEngagement: number
  minImpressions: number
  collectInterval: number // minutes
  enabled: boolean
}

export default function BuzzConfigPage() {
  const [config, setConfig] = useState<BuzzConfig>({
    keywords: ['AI', '働き方', 'ChatGPT', 'LLM'],
    accounts: ['@openai', '@anthropic', '@Google'],
    minEngagement: 100,
    minImpressions: 1000,
    collectInterval: 30,
    enabled: true
  })
  const [newKeyword, setNewKeyword] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('設定を保存しました')
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const addKeyword = () => {
    if (newKeyword && !config.keywords.includes(newKeyword)) {
      setConfig({ ...config, keywords: [...config.keywords, newKeyword] })
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setConfig({ 
      ...config, 
      keywords: config.keywords.filter(k => k !== keyword) 
    })
  }

  const addAccount = () => {
    if (newAccount && !config.accounts.includes(newAccount)) {
      const account = newAccount.startsWith('@') ? newAccount : `@${newAccount}`
      setConfig({ ...config, accounts: [...config.accounts, account] })
      setNewAccount('')
    }
  }

  const removeAccount = (account: string) => {
    setConfig({ 
      ...config, 
      accounts: config.accounts.filter(a => a !== account) 
    })
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-blue-500" />
          バズ収集設定
        </h1>
        <p className="mt-2 text-gray-600">
          KaitoAPIを使用してバズっている投稿を自動収集する設定を管理します
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 収集ON/OFF */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">自動収集</h3>
            <p className="text-sm text-gray-600">バズ投稿の自動収集を有効化</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* キーワード設定 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">収集キーワード</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="新しいキーワードを追加"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={addKeyword}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="ml-2 hover:text-blue-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* アカウント設定 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">監視アカウント</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAccount()}
              placeholder="@username"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={addAccount}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.accounts.map((account) => (
              <span
                key={account}
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full"
              >
                {account}
                <button
                  onClick={() => removeAccount(account)}
                  className="ml-2 hover:text-purple-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* エンゲージメント閾値 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最小エンゲージメント数
            </label>
            <input
              type="number"
              value={config.minEngagement}
              onChange={(e) => setConfig({ ...config, minEngagement: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <p className="mt-1 text-sm text-gray-500">
              いいね、RT、コメントの合計がこの値以上の投稿を収集
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最小インプレッション数
            </label>
            <input
              type="number"
              value={config.minImpressions}
              onChange={(e) => setConfig({ ...config, minImpressions: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <p className="mt-1 text-sm text-gray-500">
              表示回数がこの値以上の投稿を収集
            </p>
          </div>
        </div>

        {/* 収集間隔 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            収集間隔（分）
          </label>
          <select
            value={config.collectInterval}
            onChange={(e) => setConfig({ ...config, collectInterval: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value={15}>15分ごと</option>
            <option value={30}>30分ごと</option>
            <option value={60}>1時間ごと</option>
            <option value={120}>2時間ごと</option>
          </select>
        </div>

        {/* 注意事項 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-amber-900">API利用制限について</h4>
              <p className="mt-1 text-sm text-amber-700">
                KaitoAPIの利用制限に注意してください。過度な収集はAPIの利用停止につながる可能性があります。
              </p>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}