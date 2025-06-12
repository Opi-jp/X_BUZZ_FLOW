import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      expertise = 'AIと働き方',
      platform = 'Twitter',
      style = '洞察的'
    } = body
    
    // データベースを使わずにセッションIDを生成
    const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    return NextResponse.json({
      success: true,
      sessionId,
      config: {
        expertise,
        platform,
        style,
        model: 'gpt-4o'
      },
      nextStep: {
        step: 1,
        url: `/api/viral/gpt-session/${sessionId}/step1-responses-v2`,
        description: 'データ収集・初期分析'
      },
      message: 'テストセッションが作成されました（DB未使用）'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}