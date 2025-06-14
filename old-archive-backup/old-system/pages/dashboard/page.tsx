import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [
    totalBuzzPosts,
    totalScheduledPosts,
    totalPosted,
    recentAnalytics
  ] = await Promise.all([
    prisma.buzzPost.count(),
    prisma.scheduledPost.count(),
    prisma.scheduledPost.count({ where: { status: 'POSTED' } }),
    prisma.postAnalytics.findMany({
      take: 5,
      orderBy: { measuredAt: 'desc' },
      include: {
        scheduledPost: true
      }
    })
  ])

  // 直近7日間の統計
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const recentStats = await prisma.postAnalytics.aggregate({
    where: {
      measuredAt: { gte: sevenDaysAgo }
    },
    _sum: {
      impressions: true,
      likes: true,
      retweets: true,
    },
    _avg: {
      engagementRate: true,
    }
  })

  return {
    totalBuzzPosts,
    totalScheduledPosts,
    totalPosted,
    recentAnalytics,
    recentStats
  }
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  let stats
  try {
    stats = await getStats()
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">データの取得中にエラーが発生しました。</p>
          <p className="text-sm text-red-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-600">
          BuzzFlowの統計情報を確認できます
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="収集済みバズ投稿"
          value={stats.totalBuzzPosts}
          icon="🔥"
        />
        <StatCard
          title="予定投稿"
          value={stats.totalScheduledPosts}
          icon="📝"
        />
        <StatCard
          title="投稿済み"
          value={stats.totalPosted}
          icon="✅"
        />
        <StatCard
          title="平均エンゲージメント率"
          value={`${(stats.recentStats._avg.engagementRate || 0).toFixed(2)}%`}
          icon="📊"
        />
      </div>

      {/* 直近の統計 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            直近7日間のパフォーマンス
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">総インプレッション</span>
              <span className="font-semibold">
                {stats.recentStats._sum.impressions?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">総いいね</span>
              <span className="font-semibold">
                {stats.recentStats._sum.likes?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">総リツイート</span>
              <span className="font-semibold">
                {stats.recentStats._sum.retweets?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            最近の投稿分析
          </h2>
          <div className="space-y-3">
            {stats.recentAnalytics.length === 0 ? (
              <p className="text-gray-500">まだ分析データがありません</p>
            ) : (
              stats.recentAnalytics.map((analytics) => (
                <div key={analytics.id} className="border-b pb-2">
                  <p className="text-sm text-gray-900 truncate">
                    {analytics.scheduledPost.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    エンゲージメント率: {analytics.engagementRate.toFixed(2)}%
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}