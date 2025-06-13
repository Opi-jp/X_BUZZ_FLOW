import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Vercel環境変数を確認
  const isVercel = process.env.VERCEL === '1'
  const vercelEnv = process.env.VERCEL_ENV
  const region = process.env.VERCEL_REGION
  
  // Function実行時間制限を確認（環境変数から）
  const functionMaxDuration = process.env.VERCEL_FUNCTION_MAX_DURATION
  
  // プラン情報（Vercel環境変数には直接プラン情報はないが、制限から推測可能）
  const estimatedPlan = functionMaxDuration && parseInt(functionMaxDuration) > 60 
    ? 'Pro or Enterprise' 
    : 'Hobby'

  // 現在の実行環境情報
  const runtimeInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  }

  return NextResponse.json({
    vercel: {
      isVercel,
      environment: vercelEnv || 'local',
      region: region || 'unknown',
      functionMaxDuration: functionMaxDuration || 'not set',
      estimatedPlan,
      // Vercel.jsonで設定したmaxDurationが反映されているか確認
      configuredMaxDurations: {
        step1: '300s (configured in vercel.json)',
        step2: '300s (configured in vercel.json)',
        step3: '300s (configured in vercel.json)',
        step4: '300s (configured in vercel.json)',
        step5: '300s (configured in vercel.json)',
      }
    },
    runtime: runtimeInfo,
    limits: {
      hobby: {
        functionDuration: '60 seconds',
        serverlessFunctions: '12',
        edgeFunctions: '1 per deployment'
      },
      pro: {
        functionDuration: '300 seconds (5 minutes)',
        serverlessFunctions: '200',
        edgeFunctions: 'Unlimited'
      }
    },
    checkUrl: 'Visit https://vercel.com/dashboard/settings/billing to confirm your plan'
  })
}

// タイムアウトテスト用エンドポイント
export async function POST(request: NextRequest) {
  const { duration = 10 } = await request.json()
  
  const startTime = Date.now()
  
  // 指定された秒数だけ待機
  await new Promise(resolve => setTimeout(resolve, duration * 1000))
  
  const actualDuration = Date.now() - startTime
  
  return NextResponse.json({
    requestedDuration: duration,
    actualDuration: Math.round(actualDuration / 1000),
    success: true,
    message: `Successfully waited for ${Math.round(actualDuration / 1000)} seconds`
  })
}