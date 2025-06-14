'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  Home, 
  TrendingUp, 
  Newspaper, 
  Zap, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: Home },
  { 
    name: 'AIバイラル', 
    href: '/viral',
    icon: TrendingUp,
    children: [
      { name: 'CoT生成', href: '/viral/cot' },
      { name: '下書き管理', href: '/viral/drafts' },
      { name: 'パフォーマンス', href: '/viral/performance' },
    ]
  },
  { 
    name: 'ニュース', 
    href: '/news',
    icon: Newspaper,
    children: [
      { name: 'ソース管理', href: '/news/sources' },
      { name: '記事一覧', href: '/news' },
      { name: 'スレッド', href: '/news/threads' },
    ]
  },
  { 
    name: 'バズ収集', 
    href: '/buzz',
    icon: Zap,
    children: [
      { name: '収集設定', href: '/buzz/config' },
      { name: 'バズ投稿', href: '/buzz/posts' },
      { name: '引用作成', href: '/buzz/quote' },
    ]
  },
  { name: '設定', href: '/settings', icon: Settings },
]

export default function MainNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                X_BUZZ_FLOW
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <div key={item.name} className="relative group">
                    <Link
                      href={item.href}
                      className={`
                        inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium
                        ${active 
                          ? 'border-blue-500 text-gray-900' 
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                    
                    {/* Dropdown */}
                    {item.children && (
                      <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {session?.user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  @{session.user.username}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      block pl-3 pr-4 py-2 border-l-4 text-base font-medium
                      ${active
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </div>
                  </Link>
                  
                  {item.children && active && (
                    <div className="pl-8">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {session?.user && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <span className="text-sm text-gray-700">
                    @{session.user.username}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="ml-auto text-gray-400 hover:text-gray-500"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}