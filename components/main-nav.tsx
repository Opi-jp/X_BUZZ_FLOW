'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MainNav() {
  const pathname = usePathname()

  const routes = [
    {
      href: '/dashboard',
      label: 'ダッシュボード',
    },
    {
      href: '/viral/gpt',
      label: 'GPTバイラル',
    },
    {
      href: '/viral/drafts',
      label: '下書き',
    },
    {
      href: '/buzz/posts',
      label: '投稿管理',
    },
    {
      href: '/analytics',
      label: '分析',
    },
    {
      href: '/settings',
      label: '設定',
    },
  ]

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <span className="font-bold text-xl">X BUZZ FLOW</span>
        </Link>
        <div className="flex items-center space-x-6 text-sm font-medium">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'transition-colors hover:text-primary',
                pathname === route.href
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {route.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}