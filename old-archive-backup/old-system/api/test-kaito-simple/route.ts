import { NextRequest, NextResponse } from 'next/server'

// GET: Kaito API接続テスト（最小限）
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // APIキーの検証
    const testResponse = await fetch(
      `https://api.apify.com/v2/users/me?token=${process.env.KAITO_API_KEY}`
    )

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      return NextResponse.json({
        error: 'Invalid API key',
        status: testResponse.status,
        response: errorText
      }, { status: 401 })
    }

    const userData = await testResponse.json()

    // アクターの情報を取得
    const actorResponse = await fetch(
      'https://api.apify.com/v2/acts/quacker~twitter-scraper'
    )

    const actorData = await actorResponse.json()

    return NextResponse.json({
      success: true,
      user: userData.data.username,
      actor: {
        name: actorData.data.name,
        description: actorData.data.description,
        latestVersion: actorData.data.versions?.[0]?.versionNumber
      }
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}