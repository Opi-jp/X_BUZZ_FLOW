import { NextRequest, NextResponse } from 'next/server'

// GET: 実行の入力パラメータを確認
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params
    
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // Run情報を取得
    const runResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.KAITO_API_KEY}`
    )

    const runData = await runResponse.json()
    
    // 入力パラメータを取得
    const inputResponse = await fetch(
      `https://api.apify.com/v2/key-value-stores/${runData.data.defaultKeyValueStoreId}/records/INPUT?token=${process.env.KAITO_API_KEY}`
    )

    let input = null
    if (inputResponse.ok) {
      input = await inputResponse.json()
    }

    return NextResponse.json({
      runId,
      actorId: runData.data.actId,
      status: runData.data.status,
      startedAt: runData.data.startedAt,
      input: input || 'No input found',
      datasetId: runData.data.defaultDatasetId
    })

  } catch (error) {
    console.error('Check run error:', error)
    return NextResponse.json({
      error: 'Failed to check run',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}