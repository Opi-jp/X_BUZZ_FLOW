import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== Test Auto-Complete Start ===')
    
    // Step 1: セッション作成
    const createResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/gpt-session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          expertise: 'テストユーザー',
          platform: 'Twitter',
          style: 'テスト',
          model: 'gpt-4o'
        }
      })
    })

    if (!createResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'セッション作成失敗',
        details: await createResponse.text()
      }, { status: 500 })
    }

    const { sessionId } = await createResponse.json()
    console.log('Session created:', sessionId)

    // Step 2: 自動実行テスト（Step1のみ）
    const autoCompleteResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/gpt-session/auto-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        skipSteps: [2, 3, 4, 5] // Step1のみ実行
      })
    })

    const result = await autoCompleteResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Auto-complete test completed',
      sessionId,
      result,
      test: {
        step1Success: result.summary?.step1?.opportunityCount > 0,
        articlesFound: result.summary?.step1?.articlesFound || 0
      }
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}