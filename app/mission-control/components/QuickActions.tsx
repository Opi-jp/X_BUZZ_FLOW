import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  FileText, 
  Newspaper, 
  TrendingUp,
  Plus,
  PlayCircle,
  Calendar,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const actions = [
    {
      title: '新規セッション',
      description: 'AIコンテンツ生成を開始',
      icon: Brain,
      href: '/viral/v2/sessions/create',
      color: 'bg-indigo-500'
    },
    {
      title: 'ニュース分析',
      description: '最新ニュースをチェック',
      icon: Newspaper,
      href: '/news',
      color: 'bg-blue-500'
    },
    {
      title: 'バズ投稿分析',
      description: 'トレンドを分析',
      icon: TrendingUp,
      href: '/buzz',
      color: 'bg-green-500'
    },
    {
      title: 'スケジュール管理',
      description: '投稿予約を確認',
      icon: Calendar,
      href: '/viral/v2/smart-scheduler',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, idx) => (
        <Link key={idx} href={action.href}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}