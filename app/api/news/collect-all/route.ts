import { NextRequest, NextResponse } from 'next/server'

// POST: RSS収集のみ実行（Twitter収集は削除）
export async function POST(request: NextRequest) {
  try {
    const results = {
      rss: { success: false, saved: 0, error: null as string | null },
      total: 0
    }

    // RSS収集のみ実行
    try {
      // 内部APIを直接呼び出す代わりに、コードを直接実行
      console.log('Executing RSS collection...')
      const { POST: collectRSS } = await import('../collect-rss-v2/route')
      const rssRequest = new NextRequest('http://localhost:3000/api/news/collect-rss-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const rssResponse = await collectRSS(rssRequest)
      
      if (rssResponse.ok) {
        const rssData = await rssResponse.json()
        results.rss.success = true
        results.rss.saved = rssData.summary?.saved || rssData.saved || 0
        results.total += results.rss.saved
      } else {
        const errorData = await rssResponse.json()
        results.rss.error = errorData.error || 'RSS収集エラー'
      }
    } catch (error) {
      console.error('RSS collection error:', error)
      results.rss.error = 'RSS収集でエラーが発生しました'
    }

    // 結果サマリー
    const errors = []
    if (results.rss.error) errors.push(`RSS: ${results.rss.error}`)

    if (results.total === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: '収集に失敗しました',
        details: errors.join('\n'),
        results
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${results.total}件の記事を収集しました`,
      saved: results.total,
      results
    })
  } catch (error) {
    console.error('Error in collect-all:', error)
    return NextResponse.json(
      { 
        error: 'Failed to collect news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}