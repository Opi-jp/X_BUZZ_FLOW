import { NextRequest, NextResponse } from 'next/server'

// GET: データセットIDから実行情報を逆引き
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // 最近の実行履歴を取得
    const runsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs?token=${process.env.KAITO_API_KEY}&limit=20`,
    )

    if (!runsResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch runs',
        status: runsResponse.status
      }, { status: 500 })
    }

    const runsData = await runsResponse.json()
    
    // データセットIDが一致するRunを探す
    const targetDatasetId = 'qDNQTAsRIHJsrp1CE'
    const matchingRun = runsData.data?.items?.find((run: any) => 
      run.defaultDatasetId === targetDatasetId
    )

    if (matchingRun) {
      // 実行時のパラメータを取得
      const inputResponse = await fetch(
        `https://api.apify.com/v2/key-value-stores/${matchingRun.defaultKeyValueStoreId}/records/INPUT?token=${process.env.KAITO_API_KEY}`,
      )
      
      let input = null
      if (inputResponse.ok) {
        input = await inputResponse.json()
      }

      return NextResponse.json({
        found: true,
        run: {
          id: matchingRun.id,
          actorId: matchingRun.actId,
          status: matchingRun.status,
          startedAt: matchingRun.startedAt,
          finishedAt: matchingRun.finishedAt,
          datasetId: matchingRun.defaultDatasetId,
          input: input || 'Could not retrieve input parameters'
        },
        message: '成功したRunの情報が見つかりました！'
      })
    }

    // 見つからない場合は、最近の成功したRunを表示
    const successfulRuns = runsData.data?.items?.filter((run: any) => 
      run.status === 'SUCCEEDED'
    ).slice(0, 3)

    return NextResponse.json({
      found: false,
      message: 'データセットに対応するRunが見つかりませんでした',
      recentSuccessfulRuns: successfulRuns?.map((run: any) => ({
        id: run.id,
        actorId: run.actId,
        datasetId: run.defaultDatasetId,
        startedAt: run.startedAt
      }))
    })

  } catch (error) {
    console.error('Error finding run:', error)
    return NextResponse.json({
      error: 'Failed to find run',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}