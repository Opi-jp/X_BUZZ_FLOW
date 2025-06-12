import { NextRequest, NextResponse } from 'next/server'

// GET: 実行状態を確認
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params
    
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    const response = await fetch(
      `https://api.apify.com/v2/acts/quacker~twitter-scraper/runs/${runId}?token=${process.env.KAITO_API_KEY}`
    )

    const runData = await response.json()
    
    let results = null
    if (runData.data.status === 'SUCCEEDED') {
      const datasetId = runData.data.defaultDatasetId
      const itemsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
      )
      results = await itemsResponse.json()
    }

    return NextResponse.json({
      runId,
      status: runData.data.status,
      statusMessage: runData.data.statusMessage,
      itemCount: results ? results.length : 0,
      results: results ? results.slice(0, 3) : null, // 最初の3件だけ表示
      stats: runData.data.stats
    })

  } catch (error) {
    console.error('Check run error:', error)
    return NextResponse.json({
      error: 'Failed to check run',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}