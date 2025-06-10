import { NextRequest, NextResponse } from 'next/server'

// POST: すべての収集方法を順次実行
export async function POST(request: NextRequest) {
  try {
    const results = {
      rss: { success: false, saved: 0, error: null as string | null },
      aiTweets: { success: false, saved: 0, error: null as string | null },
      total: 0
    }

    // 1. RSS収集
    try {
      const rssResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/news/collect-rss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (rssResponse.ok) {
        const rssData = await rssResponse.json()
        results.rss.success = true
        results.rss.saved = rssData.saved || 0
        results.total += results.rss.saved
      } else {
        const errorData = await rssResponse.json()
        results.rss.error = errorData.error || 'RSS収集エラー'
      }
    } catch (error) {
      console.error('RSS collection error:', error)
      results.rss.error = 'RSS収集でエラーが発生しました'
    }

    // 2. AIツイート収集
    try {
      const tweetResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/news/collect-ai-tweets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (tweetResponse.ok) {
        const tweetData = await tweetResponse.json()
        results.aiTweets.success = true
        results.aiTweets.saved = tweetData.saved || 0
        results.total += results.aiTweets.saved
      } else {
        const errorData = await tweetResponse.json()
        results.aiTweets.error = errorData.error || 'ツイート収集エラー'
      }
    } catch (error) {
      console.error('Tweet collection error:', error)
      results.aiTweets.error = 'ツイート収集でエラーが発生しました'
    }

    // 結果サマリー
    const errors = []
    if (results.rss.error) errors.push(`RSS: ${results.rss.error}`)
    if (results.aiTweets.error) errors.push(`Twitter: ${results.aiTweets.error}`)

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
      message: `合計${results.total}件の記事を収集しました`,
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