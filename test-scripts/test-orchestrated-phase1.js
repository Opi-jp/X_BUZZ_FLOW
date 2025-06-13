#!/usr/bin/env node

/**
 * Orchestrated Phase 1 のテスト
 * Think → Execute → Integrate の流れを確認
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Phase 1 Think プロンプト（orchestrated-cot-strategy.tsから）
const PHASE1_THINK_PROMPT = `
# 🧭 ステップ0：テーマと役割の把握
* 発信ドメイン: {expertise}
* 目標: 流行の波がピークに達する前に、その兆しを捉える
* 立場: バズるコンテンツ戦略家（戦略視点・感情視点・構造視点の3層で観察）

# 🔍 ステップ1：検索クエリの設計

## 1-1. テーマ「{expertise}」の意味を解体する
まず、このテーマを以下の観点で細分化してください：
- 技術的側面（最新ツール、手法、革新）
- 社会的側面（影響、変化、議論）
- 制度的側面（規制、ポリシー、業界動向）

## 1-2. 検索意図別に語彙を設計
各サブテーマに対して、以下の意図別キーワードを組み合わせてください：
- 最新性: latest, 2025, trends, report, newest, update
- 信頼性: 調査, white paper, study, research, expert
- バズ性: shock, change, explosion, controversy, debate

## 1-3. クエリ構成式
[{expertise}関連語] + [影響分野] + [速報性/影響性ワード]

# ユーザー設定
* プラットフォーム: {platform}
* スタイル: {style}

# 出力形式
{
  "themeAnalysis": {
    "技術": ["サブテーマ1", "サブテーマ2"],
    "社会": ["サブテーマ1", "サブテーマ2"],
    "制度": ["サブテーマ1", "サブテーマ2"]
  },
  "queries": [
    {
      "category": "技術/社会/制度",
      "subtheme": "具体的なサブテーマ",
      "query": "検索クエリ（英語推奨）",
      "queryJa": "検索クエリ（日本語版）",
      "intent": "何を探しているか",
      "expectedInsight": "期待される洞察",
      "buzzPotential": "高/中/低"
    }
  ]
}

重要：
- {expertise}の専門性を深く理解した上で検索クエリを設計
- 英語と日本語の両方でクエリを生成（グローバルと国内の視点）
- バズの兆しを捉えるため、感情トリガーとなる語彙を含める
- 10-15個の多様な検索クエリを生成`

async function phase1Think(context) {
  console.log('🤔 Phase 1 - Think: 検索クエリ生成中...\n')
  
  const prompt = PHASE1_THINK_PROMPT
    .replace(/{expertise}/g, context.expertise)
    .replace(/{platform}/g, context.platform)
    .replace(/{style}/g, context.style)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'あなたは優秀なコンテンツ戦略家です。必ずJSON形式で応答してください。' },
        { role: 'user', content: prompt + '\n\n必ずJSON形式で出力してください。' }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('✅ Think完了!')
    console.log(`生成されたクエリ数: ${result.queries?.length || 0}`)
    
    if (result.queries) {
      console.log('\n📝 サンプルクエリ:')
      result.queries.slice(0, 3).forEach((q, i) => {
        console.log(`${i + 1}. [${q.category}] ${q.query}`)
        console.log(`   意図: ${q.intent}`)
        console.log(`   バズ性: ${q.buzzPotential}`)
      })
    }

    return result
  } catch (error) {
    console.error('❌ Think失敗:', error.message)
    return null
  }
}

async function phase1Execute(thinkResult) {
  console.log('\n🔧 Phase 1 - Execute: Google検索実行中...\n')
  
  if (!thinkResult?.queries) {
    console.error('❌ 検索クエリがありません')
    return null
  }

  const searchResults = []
  
  // 最初の3つのクエリのみ実行（テスト用）
  for (const queryObj of thinkResult.queries.slice(0, 3)) {
    console.log(`🔍 検索: "${queryObj.query}"`)
    
    try {
      const params = new URLSearchParams({
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: queryObj.query,
        num: '3',
        dateRestrict: 'd7'
      })

      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
      const data = await response.json()

      if (data.items) {
        searchResults.push({
          query: queryObj.query,
          category: queryObj.category,
          intent: queryObj.intent,
          buzzPotential: queryObj.buzzPotential,
          results: data.items.map(item => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
            source: item.displayLink
          }))
        })
        console.log(`✅ ${data.items.length}件の結果取得`)
      }
    } catch (error) {
      console.error(`❌ 検索失敗: ${error.message}`)
    }
  }

  console.log(`\n✅ Execute完了! 総検索結果: ${searchResults.length}クエリ`)
  return { searchResults }
}

async function testPhase1() {
  console.log('=== Orchestrated Phase 1 テスト ===\n')
  
  // テスト用のコンテキスト
  const context = {
    expertise: 'AI × 働き方',
    platform: 'Twitter',
    style: '教育的'
  }

  console.log('📋 設定:')
  console.log(`専門分野: ${context.expertise}`)
  console.log(`プラットフォーム: ${context.platform}`)
  console.log(`スタイル: ${context.style}`)
  console.log('')

  // Phase 1 - Think
  const startTime = Date.now()
  const thinkResult = await phase1Think(context)
  const thinkDuration = Date.now() - startTime

  if (!thinkResult) {
    console.error('❌ Phase 1 Think失敗')
    return
  }

  // Phase 1 - Execute
  const executeStart = Date.now()
  const executeResult = await phase1Execute(thinkResult)
  const executeDuration = Date.now() - executeStart

  console.log('\n📊 実行統計:')
  console.log(`Think所要時間: ${thinkDuration}ms`)
  console.log(`Execute所要時間: ${executeDuration}ms`)
  console.log(`合計時間: ${thinkDuration + executeDuration}ms`)

  // 結果をファイルに保存
  const results = {
    context,
    thinkResult,
    executeResult,
    metrics: {
      thinkDuration,
      executeDuration,
      totalDuration: thinkDuration + executeDuration
    },
    timestamp: new Date().toISOString()
  }

  const fs = require('fs')
  const filename = `phase1-test-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testPhase1().catch(console.error)