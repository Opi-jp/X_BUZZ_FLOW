#!/usr/bin/env node

/**
 * Phase 1の簡易テスト（5クエリ版）
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function runPhase1() {
  const context = {
    expertise: 'AI × 働き方',
    platform: 'Twitter', 
    style: '教育的'
  }

  console.log('=== Phase 1 簡易テスト (5クエリ版) ===\n')
  console.log('設定:', context)
  console.log('')

  // Step 1: Think - 5個のクエリを生成
  console.log('🤔 Step 1: 検索クエリ生成...')
  const thinkPrompt = `
あなたはバズるコンテンツ戦略家です。

テーマ: ${context.expertise}
プラットフォーム: ${context.platform}
スタイル: ${context.style}

このテーマに関して、最もバズる可能性が高い検索クエリを5個生成してください。
各クエリは異なる角度（技術/社会/感情）から設計してください。

JSON形式で出力:
{
  "queries": [
    {
      "query": "英語の検索クエリ",
      "intent": "検索意図",
      "angle": "技術/社会/感情"
    }
  ]
}`

  const thinkResult = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'JSON形式で応答してください。' },
      { role: 'user', content: thinkPrompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const queries = JSON.parse(thinkResult.choices[0].message.content).queries
  console.log(`✅ ${queries.length}個のクエリ生成完了\n`)

  // Step 2: Execute - Google検索
  console.log('🔍 Step 2: Google検索実行...')
  const searchResults = []
  
  for (const q of queries) {
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
          query: q.query,
          angle: q.angle,
          results: data.items.map(item => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
          }))
        })
        console.log(`✓ "${q.query}" - ${data.items.length}件`)
      }
    } catch (error) {
      console.error(`✗ "${q.query}" - エラー`)
    }
  }
  console.log(`✅ 検索完了: ${searchResults.length}クエリ\n`)

  // Step 3: Integrate - 分析
  console.log('🧠 Step 3: バズ機会の分析...')
  const integratePrompt = `
あなたはバズるコンテンツ戦略家です。

以下の検索結果から、最もバズる可能性が高いトピックを3つ特定してください。

検索結果:
${JSON.stringify(searchResults, null, 2)}

各トピックについて以下を評価:
- 感情的インパクト (0-1)
- 議論性 (0-1)
- タイミング性 (0-1)
- 総合スコア (0-1)

JSON形式で出力:
{
  "opportunities": [
    {
      "topic": "トピック名",
      "summary": "50文字以内の要約",
      "emotionalTrigger": "感情トリガー",
      "scores": {
        "emotion": 0.0,
        "controversy": 0.0,
        "timing": 0.0,
        "overall": 0.0
      },
      "source": {
        "title": "参照記事タイトル",
        "url": "URL"
      }
    }
  ],
  "insight": "全体的な分析"
}`

  const integrateResult = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'JSON形式で応答してください。' },
      { role: 'user', content: integratePrompt }
    ],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  })

  const analysis = JSON.parse(integrateResult.choices[0].message.content)
  console.log(`✅ ${analysis.opportunities.length}個の機会を特定\n`)

  // 結果表示
  console.log('📊 トップバズ機会:')
  analysis.opportunities.forEach((opp, i) => {
    console.log(`\n${i + 1}. ${opp.topic} (スコア: ${opp.scores.overall})`)
    console.log(`   ${opp.summary}`)
    console.log(`   感情: ${opp.emotionalTrigger}`)
    console.log(`   出典: ${opp.source.title}`)
  })

  console.log('\n💡 インサイト:')
  console.log(analysis.insight)

  // 結果を保存
  const fs = require('fs')
  const filename = `phase1-simple-${Date.now()}.json`
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
runPhase1().catch(console.error)