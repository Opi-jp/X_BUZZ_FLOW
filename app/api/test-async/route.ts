import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Async test API is working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // バックグラウンド処理をシミュレート（待たない）
    setTimeout(() => {
      console.log('[TEST ASYNC] Background task executed after 2 seconds')
    }, 2000)
    
    // すぐにレスポンスを返す
    return NextResponse.json({
      message: 'Request received, processing in background',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse JSON body' },
      { status: 400 }
    )
  }
}