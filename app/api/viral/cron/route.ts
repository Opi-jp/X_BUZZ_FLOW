import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // cronシークレットの検証
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Viral Cron] 開始:', new Date().toISOString())

    // 1. 自動ワークフローを実行
    const workflowResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/workflow/auto-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expertise: 'AI × 働き方、25年のクリエイティブ経験',
        platform: 'Twitter',
        style: '解説 × エンタメ',
        minViralScore: 0.8,
        maxOpportunities: 2,
        autoSchedule: true
      })
    })

    const workflowResult = await workflowResponse.json()
    console.log('[Viral Cron] ワークフロー結果:', workflowResult.workflow)

    // 2. スケジュールされた投稿を実行
    const postResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/post`, {
      method: 'GET'
    })

    const postResult = await postResponse.json()
    console.log('[Viral Cron] 投稿結果:', postResult.processed, '件処理')

    // 3. パフォーマンストラッキング（30分経過した投稿）
    const track30mResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/track-performance?metric=30m`, {
      method: 'GET'
    })
    const track30mResult = await track30mResponse.json()

    // 4. パフォーマンストラッキング（1時間経過した投稿）
    const track1hResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/track-performance?metric=1h`, {
      method: 'GET'
    })
    const track1hResult = await track1hResponse.json()

    // 5. パフォーマンストラッキング（24時間経過した投稿）
    const track24hResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/track-performance?metric=24h`, {
      method: 'GET'
    })
    const track24hResult = await track24hResponse.json()

    console.log('[Viral Cron] 完了:', new Date().toISOString())

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        workflow: workflowResult.workflow,
        posts: postResult.processed,
        tracking: {
          '30m': track30mResult.processed,
          '1h': track1hResult.processed,
          '24h': track24hResult.processed
        }
      }
    })

  } catch (error) {
    console.error('[Viral Cron] エラー:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}