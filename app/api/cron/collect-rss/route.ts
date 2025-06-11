import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron Job用のエンドポイント
// vercel.jsonで設定: 毎日朝6時（JST）に実行

export async function GET(request: NextRequest) {
  // Vercel Cronからのリクエストかチェック
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'production') {
    if (!isVercelCron || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    console.log('Starting daily RSS collection...')
    
    // 内部APIを呼び出し
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/news/collect-rss-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 今日の日付から収集
        sinceDate: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`RSS collection failed: ${response.status}`)
    }

    const result = await response.json()
    
    console.log('Daily RSS collection completed:', result)

    return NextResponse.json({
      success: true,
      message: 'Daily RSS collection completed',
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to collect RSS', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}