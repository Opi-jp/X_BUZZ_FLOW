'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  name: string
  href: string
  icon: string
  primary?: boolean
  divider?: boolean
}

const navigation: NavItem[] = [
  // メインワークフロー
  { name: '朝の準備', href: '/morning', icon: '☀️', primary: true },
  { name: 'コンテンツ管理', href: '/content', icon: '📝' },
  { name: 'リアルタイム', href: '/realtime', icon: '⚡' },
  { name: '振り返り', href: '/review', icon: '📊' },
  
  // 区切り線
  { divider: true, name: '', href: '', icon: '' },
  
  // データ・設定
  { name: 'ニュース管理', href: '/news', icon: '📰' },
  { name: '設定', href: '/settings', icon: '⚙️' },
]

// 移行期間用の旧ページリンク（下部に小さく表示）
const legacyPages = [
  { name: 'AI秘書（旧）', href: '/dashboard-v2' },
  { name: '投稿一覧（旧）', href: '/posts' },
  { name: '投稿収集（旧）', href: '/collect' },
  { name: '分析（旧）', href: '/analytics' },
]

import dynamic from 'next/dynamic'

const AuthButton = dynamic(() => import('@/components/auth/AuthButton'), {
  ssr: false,
})

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">BuzzFlow</h1>
      </div>
      
      {/* メインナビゲーション */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item, index) => {
          // 区切り線
          if (item.divider) {
            return <div key={index} className="my-4 border-t border-gray-700" />
          }
          
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gray-800 text-white shadow-lg'
                  : item.primary
                  ? 'text-yellow-300 hover:bg-gray-800 hover:text-yellow-200 font-semibold'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      {/* 旧ページリンク（移行期間のみ） */}
      <div className="border-t border-gray-700 px-3 py-3">
        <p className="text-xs text-gray-500 mb-2">移行中のページ：</p>
        <div className="space-y-1">
          {legacyPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block text-xs text-gray-500 hover:text-gray-400 px-3 py-1"
            >
              {page.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-800">
        <AuthButton />
      </div>
    </div>
  )
}