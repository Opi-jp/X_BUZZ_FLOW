import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// バズ収集設定の型定義
interface BuzzConfig {
  keywords: string[]
  accounts: string[]
  minEngagement: number
  minImpressions: number
  collectInterval: number // minutes
  enabled: boolean
}

// デフォルト設定
const DEFAULT_CONFIG: BuzzConfig = {
  keywords: ['AI ツール', 'AI ニュース', 'ChatGPT', '働き方 未来', 'フリーランス', 'クリエイティブ ツール'],
  accounts: ['@opi', '@openai', '@anthropic'],
  minEngagement: 100, // より多くのデータを収集するため下げる
  minImpressions: 1000,
  collectInterval: 60, // 1時間ごと
  enabled: false // デフォルトは無効
}

// GET: 現在の設定を取得
export async function GET() {
  try {
    // データベースから設定を取得（まずは簡易的にJSONファイルやDBの単一レコードとして管理）
    const configRecord = await prisma.buzzConfig.findFirst({
      orderBy: { updatedAt: 'desc' }
    }).catch(() => null)

    const config = configRecord ? {
      keywords: configRecord.keywords as string[],
      accounts: configRecord.accounts as string[],
      minEngagement: configRecord.minEngagement,
      minImpressions: configRecord.minImpressions,
      collectInterval: configRecord.collectInterval,
      enabled: configRecord.enabled
    } : DEFAULT_CONFIG

    return NextResponse.json({ config })

  } catch (error) {
    console.error('Error fetching buzz config:', error)
    // エラーの場合はデフォルト設定を返す
    return NextResponse.json({ config: DEFAULT_CONFIG })
  }
}

// POST: 設定を保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config: BuzzConfig = {
      keywords: body.keywords || DEFAULT_CONFIG.keywords,
      accounts: body.accounts || DEFAULT_CONFIG.accounts,
      minEngagement: body.minEngagement || DEFAULT_CONFIG.minEngagement,
      minImpressions: body.minImpressions || DEFAULT_CONFIG.minImpressions,
      collectInterval: body.collectInterval || DEFAULT_CONFIG.collectInterval,
      enabled: body.enabled !== undefined ? body.enabled : DEFAULT_CONFIG.enabled
    }

    // 設定を保存（単一レコードとして管理）
    const savedConfig = await prisma.buzzConfig.upsert({
      where: { id: 'default' }, // 固定ID
      update: {
        keywords: config.keywords,
        accounts: config.accounts,
        minEngagement: config.minEngagement,
        minImpressions: config.minImpressions,
        collectInterval: config.collectInterval,
        enabled: config.enabled,
        updatedAt: new Date()
      },
      create: {
        id: 'default',
        keywords: config.keywords,
        accounts: config.accounts,
        minEngagement: config.minEngagement,
        minImpressions: config.minImpressions,
        collectInterval: config.collectInterval,
        enabled: config.enabled
      }
    })

    // 自動収集スケジューラーの更新をトリガー（必要に応じて）
    if (config.enabled) {
      console.log('Auto collection enabled with config:', config)
      // TODO: cron job の更新/作成
    } else {
      console.log('Auto collection disabled')
      // TODO: cron job の停止
    }

    return NextResponse.json({ 
      success: true, 
      config: savedConfig,
      message: '設定を保存しました'
    })

  } catch (error) {
    console.error('Error saving buzz config:', error)
    return NextResponse.json(
      { error: 'Failed to save config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT: 手動収集実行（設定に基づく）
export async function PUT(request: NextRequest) {
  try {
    // 現在の設定を取得
    const configRecord = await prisma.buzzConfig.findFirst({
      orderBy: { updatedAt: 'desc' }
    })

    const config = configRecord || DEFAULT_CONFIG

    if (!config.enabled) {
      return NextResponse.json(
        { error: '自動収集が無効になっています' },
        { status: 400 }
      )
    }

    // 設定に基づいてクエリを構築
    const queries = []
    
    // キーワードベースのクエリ
    if (config.keywords && config.keywords.length > 0) {
      const keywordQuery = config.keywords.join(' OR ')
      queries.push(`(${keywordQuery}) min_faves:${config.minEngagement}`)
    }

    // アカウントベースのクエリ
    if (config.accounts && config.accounts.length > 0) {
      config.accounts.forEach(account => {
        const username = account.replace('@', '')
        queries.push(`from:${username}`)
      })
    }

    // 収集を実行
    const results = []
    for (const query of queries.slice(0, 3)) { // 最大3つのクエリまで
      try {
        const collectResponse = await fetch('http://localhost:3000/api/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            minLikes: config.minEngagement,
            minRetweets: Math.floor(config.minEngagement / 10),
            maxItems: 10
          })
        })

        if (collectResponse.ok) {
          const collectData = await collectResponse.json()
          results.push({
            query,
            collected: collectData.collected,
            saved: collectData.saved,
            skipped: collectData.skipped
          })
        }
      } catch (error) {
        console.error('Collection error for query:', query, error)
      }

      // レート制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return NextResponse.json({
      success: true,
      results,
      totalQueries: queries.length,
      message: `${results.length}個のクエリで収集を実行しました`
    })

  } catch (error) {
    console.error('Error executing manual collection:', error)
    return NextResponse.json(
      { error: 'Failed to execute collection' },
      { status: 500 }
    )
  }
}