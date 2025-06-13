#!/usr/bin/env node

/**
 * Phase 1テスト - 3層観察アプローチ版
 * 戦略視点・感情視点・構造視点でクエリを生成
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function runPhase1WithThreeLayers() {
  const context = {
    expertise: 'AI × 働き方',
    platform: 'Twitter', 
    style: '教育的'
  }

  console.log('=== Phase 1: 3層観察アプローチ ===\n')
  console.log('📋 設定:')
  console.log(`発信したい分野: ${context.expertise}`)
  console.log(`プラットフォーム: ${context.platform}`)
  console.log(`スタイル: ${context.style}`)
  console.log('\n立場: バズるコンテンツ戦略家')
  console.log('観察視点: 戦略視点・感情視点・構造視点\n')

  // Step 1: Think - 3層視点でクエリ生成
  console.log('🤔 Step 1: 3層視点での検索クエリ生成...')
  const thinkPrompt = `
あなたはバズるコンテンツ戦略家です。
以下の3つの視点から、バズる可能性の高い検索クエリを生成してください。

# 設定
- 発信したい分野: ${context.expertise}
- プラットフォーム: ${context.platform}
- スタイル: ${context.style}

# 3層の観察視点

## 1. 戦略視点（Strategic Layer）
業界の大きな流れ、将来予測、ビジネスインパクトを捉える
- キーワード例: trends, forecast, impact, transformation, disruption

## 2. 感情視点（Emotional Layer）
人々の不安、期待、驚き、議論を引き起こす要素を捉える
- キーワード例: controversy, debate, shocking, fear, excitement

## 3. 構造視点（Structural Layer）
システム、制度、ルール、フレームワークの変化を捉える
- キーワード例: regulation, policy, framework, guidelines, standards

# タスク
各視点から2個ずつ、合計6個の検索クエリを生成してください。
バズの兆しを捉えるため、最新性（2025, latest）と影響性（impact, change）を意識してください。

# 出力形式（JSON）
{
  "queries": [
    {
      "layer": "戦略/感情/構造",
      "query": "英語の検索クエリ",
      "queryJa": "日本語版クエリ",
      "intent": "このクエリで何を探るか",
      "buzzPotential": "なぜバズる可能性があるか"
    }
  ]
}`

  const thinkResult = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'バズるコンテンツ戦略家として、必ずJSON形式で応答してください。' },
      { role: 'user', content: thinkPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  })

  const queries = JSON.parse(thinkResult.choices[0].message.content).queries
  console.log(`✅ ${queries.length}個のクエリ生成完了\n`)

  // 視点別に表示
  console.log('📊 生成されたクエリ（視点別）:')
  const layers = ['戦略', '感情', '構造']
  layers.forEach(layer => {
    console.log(`\n【${layer}視点】`)
    queries.filter(q => q.layer === layer).forEach((q, i) => {
      console.log(`${i + 1}. ${q.query}`)
      console.log(`   意図: ${q.intent}`)
      console.log(`   バズ性: ${q.buzzPotential}`)
    })
  })

  // Step 2: Execute - Google検索（最初の3つのみ）
  console.log('\n\n🔍 Step 2: Google検索実行...')
  const searchResults = []
  
  // 各視点から1つずつ、計3つを検索
  const selectedQueries = [
    queries.find(q => q.layer === '戦略'),
    queries.find(q => q.layer === '感情'),
    queries.find(q => q.layer === '構造')
  ].filter(Boolean)

  for (const q of selectedQueries) {
    try {
      const params = new URLSearchParams({
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: q.query,
        num: '3',
        dateRestrict: 'd7'
      })

      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
      const data = await response.json()

      if (data.items) {
        searchResults.push({
          layer: q.layer,
          query: q.query,
          intent: q.intent,
          results: data.items.map(item => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
          }))
        })
        console.log(`✓ [${q.layer}] "${q.query}" - ${data.items.length}件`)
      }
    } catch (error) {
      console.error(`✗ [${q.layer}] "${q.query}" - エラー`)
    }
  }

  // Step 3: Integrate - 3層視点での分析
  console.log('\n\n🧠 Step 3: 3層視点でのバズ機会分析...')
  const integratePrompt = `
あなたはバズるコンテンツ戦略家です。
3層の視点（戦略・感情・構造）から収集した検索結果を分析し、最もバズる可能性の高い機会を特定してください。

# 検索結果
${JSON.stringify(searchResults, null, 2)}

# 分析タスク
1. 各層から得られた洞察を抽出
2. 層をまたがる関連性やパターンを発見
3. 最もバズる可能性の高い統合的な機会を3つ特定

# 評価基準
- 戦略的重要性（ビジネスインパクト）
- 感情的共鳴度（議論や感情を呼ぶか）
- 構造的変化（ルールや仕組みの変化）
- タイミング性（今だからこそ価値がある）

# 出力形式（JSON）
{
  "layerInsights": {
    "戦略": "戦略視点からの主要な発見",
    "感情": "感情視点からの主要な発見",
    "構造": "構造視点からの主要な発見"
  },
  "crossLayerPatterns": [
    "層をまたがるパターンや関連性"
  ],
  "topOpportunities": [
    {
      "title": "バズ機会のタイトル",
      "description": "なぜこれがバズるのか（50文字以内）",
      "layers": ["関連する視点"],
      "emotionalTrigger": "感情的なフック",
      "strategicValue": "戦略的価値",
      "viralScore": 0.0-1.0,
      "source": {
        "title": "参照記事",
        "url": "URL"
      }
    }
  ],
  "recommendation": "${context.platform}での投稿に向けた具体的な提案"
}`

  const integrateResult = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'バズるコンテンツ戦略家として、必ずJSON形式で応答してください。' },
      { role: 'user', content: integratePrompt }
    ],
    temperature: 0.5,
    max_tokens: 3000,
    response_format: { type: 'json_object' }
  })

  const analysis = JSON.parse(integrateResult.choices[0].message.content)
  console.log('✅ 分析完了\n')

  // 結果表示
  console.log('📋 層別インサイト:')
  Object.entries(analysis.layerInsights).forEach(([layer, insight]) => {
    console.log(`【${layer}】${insight}`)
  })

  console.log('\n🔗 層をまたがるパターン:')
  analysis.crossLayerPatterns.forEach((pattern, i) => {
    console.log(`${i + 1}. ${pattern}`)
  })

  console.log('\n🎯 トップバズ機会:')
  analysis.topOpportunities.forEach((opp, i) => {
    console.log(`\n${i + 1}. ${opp.title} (スコア: ${opp.viralScore})`)
    console.log(`   ${opp.description}`)
    console.log(`   関連視点: ${opp.layers.join('・')}`)
    console.log(`   感情フック: ${opp.emotionalTrigger}`)
    console.log(`   戦略的価値: ${opp.strategicValue}`)
    console.log(`   出典: ${opp.source.title}`)
  })

  console.log('\n💡 推奨アクション:')
  console.log(analysis.recommendation)

  // 結果を保存
  const fs = require('fs')
  const filename = `phase1-3layers-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify({
    context,
    queries,
    searchResults,
    analysis,
    timestamp: new Date().toISOString()
  }, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
runPhase1WithThreeLayers().catch(console.error)