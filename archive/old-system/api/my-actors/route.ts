import { NextRequest, NextResponse } from 'next/server'

// GET: 自分のApifyアカウントにあるアクター一覧を取得
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // 自分のアクター一覧を取得
    const response = await fetch(
      `https://api.apify.com/v2/acts?token=${process.env.KAITO_API_KEY}`,
    )
    
    // 最近使用したアクターの実行履歴も取得
    const runsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs?token=${process.env.KAITO_API_KEY}&limit=10`,
    )

    if (!response.ok) {
      return NextResponse.json({
        error: 'Failed to fetch actors',
        status: response.status
      }, { status: 500 })
    }

    const data = await response.json()
    
    // Twitter関連のアクターをハイライト
    const actors = data.data?.items?.map((actor: any) => ({
      id: actor.id,
      name: actor.name,
      username: actor.username,
      isTwitterRelated: actor.name.toLowerCase().includes('twitter') || 
                       actor.description?.toLowerCase().includes('twitter'),
      createdAt: actor.createdAt,
      modifiedAt: actor.modifiedAt,
      versions: actor.versions?.length || 0,
      builds: actor.builds?.length || 0,
      runs: actor.stats?.totalRuns || 0
    })) || []

    // Twitter関連を先頭に
    const sortedActors = [
      ...actors.filter((a: any) => a.isTwitterRelated),
      ...actors.filter((a: any) => !a.isTwitterRelated)
    ]

    // 最近の実行履歴から使用されたアクターを確認
    let recentRuns = []
    if (runsResponse.ok) {
      const runsData = await runsResponse.json()
      recentRuns = runsData.data?.items?.map((run: any) => ({
        actorId: run.actId,
        status: run.status,
        startedAt: run.startedAt,
        datasetId: run.defaultDatasetId
      })) || []
    }

    return NextResponse.json({
      total: actors.length,
      twitterRelated: actors.filter((a: any) => a.isTwitterRelated).length,
      actors: sortedActors,
      recentRuns: recentRuns.slice(0, 5)
    })

  } catch (error) {
    console.error('Error fetching actors:', error)
    return NextResponse.json({
      error: 'Failed to fetch actors',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}