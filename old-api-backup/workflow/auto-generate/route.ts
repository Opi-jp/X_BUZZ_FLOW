import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      expertise = 'AI × 働き方、25年のクリエイティブ経験',
      platform = 'Twitter',
      style = '解説 × エンタメ',
      minViralScore = 0.8,
      maxOpportunities = 3,
      autoSchedule = true
    } = body

    // 1. トレンド分析（ChatGPT）
    console.log('ステップ1: トレンド分析を開始...')
    const analyzeResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/analyze-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expertise,
        platform,
        style,
        forceRefresh: true // 常に新規分析
      })
    })

    if (!analyzeResponse.ok) {
      throw new Error(`トレンド分析エラー: ${analyzeResponse.status}`)
    }

    const { opportunities } = await analyzeResponse.json()
    console.log(`${opportunities.length}件のバズ機会を発見`)

    // 2. 高ポテンシャル案件を選択
    const topOpportunities = opportunities
      .filter((o: any) => o.viralScore >= minViralScore)
      .sort((a: any, b: any) => b.viralScore - a.viralScore)
      .slice(0, maxOpportunities)

    if (topOpportunities.length === 0) {
      return NextResponse.json({
        success: true,
        message: `バイラルスコア${minViralScore}以上の機会が見つかりませんでした`,
        opportunities: [],
        posts: []
      })
    }

    console.log(`${topOpportunities.length}件の高ポテンシャル案件を選択`)

    // 3. コンテンツ生成（Claude）
    console.log('ステップ2: コンテンツ生成を開始...')
    const generateResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/generate-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityIds: topOpportunities.map((o: any) => o.id)
      })
    })

    if (!generateResponse.ok) {
      throw new Error(`コンテンツ生成エラー: ${generateResponse.status}`)
    }

    const { posts } = await generateResponse.json()
    console.log(`${posts.length}件の投稿を生成`)

    // 4. 自動スケジューリング（オプション）
    if (autoSchedule && posts.length > 0) {
      console.log('ステップ3: 投稿をスケジュール...')
      
      // 投稿をscheduledステータスに更新
      await Promise.all(
        posts.map(async (post: any) => {
          await prisma.viralPost.update({
            where: { id: post.id },
            data: { 
              scheduledAt: post.scheduledAt || new Date(Date.now() + 30 * 60 * 1000) // デフォルト30分後
            }
          })
        })
      )

      // 対応する機会をscheduledに更新
      await prisma.viralOpportunity.updateMany({
        where: { id: { in: topOpportunities.map((o: any) => o.id) } },
        data: { status: 'scheduled' }
      })
    }

    // 5. ワークフローログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'workflow',
        phase: 'auto_generate',
        prompt: JSON.stringify({ expertise, platform, style, minViralScore }),
        response: {
          opportunitiesFound: opportunities.length,
          opportunitiesSelected: topOpportunities.length,
          postsGenerated: posts.length,
          autoScheduled: autoSchedule
        },
        success: true
      }
    })

    return NextResponse.json({
      success: true,
      apiSource: 'workflow-auto-generate',
      workflow: {
        opportunitiesAnalyzed: opportunities.length,
        opportunitiesSelected: topOpportunities.length,
        postsGenerated: posts.length,
        autoScheduled: autoSchedule
      },
      opportunities: topOpportunities,
      posts
    })

  } catch (error) {
    console.error('Workflow error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'workflow',
        phase: 'auto_generate',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'ワークフローでエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 手動実行用のGETエンドポイント
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const execute = searchParams.get('execute')

  if (execute !== 'true') {
    return NextResponse.json({
      message: 'ワークフロー自動生成API',
      usage: 'POST /api/viral/workflow/auto-generate または GET /api/viral/workflow/auto-generate?execute=true',
      parameters: {
        expertise: '専門分野（デフォルト: AI × 働き方、25年のクリエイティブ経験）',
        platform: 'プラットフォーム（デフォルト: Twitter）',
        style: 'スタイル（デフォルト: 解説 × エンタメ）',
        minViralScore: '最小バイラルスコア（デフォルト: 0.8）',
        maxOpportunities: '最大機会数（デフォルト: 3）',
        autoSchedule: '自動スケジュール（デフォルト: true）'
      }
    })
  }

  // デフォルト設定で実行
  return POST(request)
}