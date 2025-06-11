'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: '🤖 AI秘書', href: '/dashboard-v2', icon: '🚀' },
  { name: 'Perplexity', href: '/perplexity-test', icon: '🔥' },
  { name: 'ダッシュボード', href: '/dashboard', icon: '📊' },
  { name: 'バズ投稿', href: '/posts', icon: '💫' },
  { name: '投稿収集', href: '/collect', icon: '🔍' },
  { name: '投稿作成', href: '/create', icon: '✍️' },
  { name: 'スケジュール', href: '/schedule', icon: '📅' },
  { name: '分析', href: '/analytics', icon: '📈' },
  { name: 'AIニュース', href: '/news', icon: '📰' },
  { name: 'スレッド管理', href: '/news/threads', icon: '🧵' },
  { name: 'AIパターン', href: '/patterns', icon: '🎨' },
  { name: '設定', href: '/settings', icon: '⚙️' },
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
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center rounded-md px-3 py-2 text-sm font-medium
                ${isActive
                  ? 'bg-gray-800 text-white'
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
      <div className="px-6 py-4 border-t border-gray-800">
        <AuthButton />
      </div>
    </div>
  )
}