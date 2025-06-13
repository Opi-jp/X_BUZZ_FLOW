#!/usr/bin/env node

/**
 * Phase 1 Integrate段階のテスト
 * 検索結果を分析してバズる機会を特定
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')
const fs = require('fs')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Phase 1 Integrate プロンプト（orchestrated-cot-strategy.tsから）
const PHASE1_INTEGRATE_PROMPT = `
# 🧠 ステップ3：GPTによる分析と機会特定

## 役割設定
あなたは、バズるコンテンツ戦略家です。
* 専門分野: {expertise}
* プラットフォーム: {platform}  
* スタイル: {style}

## 🧾 ステップ2で収集した検索結果
{searchResults}

## 分析タスク

### 3-1. トピック抽出と構造化
検索結果から、バズの兆しとなるトピックを抽出してください。
各トピックは以下の要素を含めてください：

**【トピック名】**
- 要約：核心を50文字以内で
- 出典1：タイトル＋URL
- 出典2：タイトル＋URL（複数ソースで裏付け）
- バズ要素：（感情トリガー／議論性／共感性）
- 専門家視点：{expertise}の観点から見た独自の切り口

### 3-2. バイラルパターン認識（6軸評価）
各トピックを以下の6軸で評価（0-1のスコア）：
1. **論争レベル** - 強い意見を生み出すか
2. **感情の強さ** - 驚き・焦燥・期待・憤慨を引き起こすか
3. **共感性要因** - 多くの人に「自分ごと」と感じさせるか
4. **共有可能性** - 「これは広めたい」と思わせるか
5. **タイミングの敏感さ** - 今このタイミングだからこそ価値があるか
6. **{platform}適合度** - プラットフォームの文化に合っているか

### 3-3. 感情トリガーの抽出
スニペット中の以下の感情語を特に注目：
- 驚き系：「衝撃」「予想外」「まさか」「shock」「explosion」
- 焦燥系：「急速に」「加速」「取り残される」
- 期待系：「革新」「新時代」「可能性」「latest」「trends」
- 議論系：「賛否」「議論」「波紋」「controversy」「debate」

## 出力形式（JSON）
{
  "extractedTopics": [
    {
      "topicName": "具体的なトピック名",
      "summary": "核心を捉えた50文字以内の要約",
      "sources": [
        {"title": "記事タイトル", "url": "URL"},
        {"title": "記事タイトル", "url": "URL"}
      ],
      "buzzElements": {
        "emotionalTrigger": "具体的な感情トリガー",
        "controversyLevel": "高/中/低",
        "relatabilityFactor": "共感ポイント"
      },
      "expertPerspective": "{expertise}の専門家としての独自解釈",
      "viralScores": {
        "controversy": 0.0-1.0,
        "emotion": 0.0-1.0,
        "relatability": 0.0-1.0,
        "shareability": 0.0-1.0,
        "timeSensitivity": 0.0-1.0,
        "platformFit": 0.0-1.0
      },
      "overallScore": 0.0-1.0,
      "reasoning": "このトピックがバズる理由"
    }
  ],
  "topOpportunities": [
    // overallScoreが高い順に最大5件
  ],
  "opportunityCount": 数値,
  "analysisInsights": "全体を通じて見えてきたトレンドや傾向",
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。"
}

## 🚨 注意点
- URLは必ず含める（ファクトチェック可能性のため）
- 感情語は具体的に引用する
- {expertise}の文脈を常に意識する

必ずJSON形式で出力してください。`

async function phase1Integrate(context, searchResults) {
  console.log('🧠 Phase 1 - Integrate: 検索結果を分析中...\n')
  
  const prompt = PHASE1_INTEGRATE_PROMPT
    .replace(/{expertise}/g, context.expertise)
    .replace(/{platform}/g, context.platform)
    .replace(/{style}/g, context.style)
    .replace(/{searchResults}/g, JSON.stringify(searchResults, null, 2))

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'あなたはコンテンツ戦略の専門家です。必ずJSON形式で応答してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('✅ Integrate完了!')
    console.log(`抽出されたトピック数: ${result.extractedTopics?.length || 0}`)
    console.log(`特定された機会数: ${result.topOpportunities?.length || 0}`)
    
    if (result.topOpportunities) {
      console.log('\n🎯 トップ機会:')
      result.topOpportunities.slice(0, 3).forEach((opp, i) => {
        console.log(`${i + 1}. ${opp.topicName} (スコア: ${opp.overallScore})`)
        console.log(`   ${opp.summary}`)
        console.log(`   感情トリガー: ${opp.buzzElements.emotionalTrigger}`)
      })
    }

    return result
  } catch (error) {
    console.error('❌ Integrate失敗:', error.message)
    return null
  }
}

async function testPhase1Complete() {
  console.log('=== Phase 1 完全テスト (Think → Execute → Integrate) ===\n')
  
  // 前回のテスト結果を読み込む
  const previousResults = JSON.parse(
    fs.readFileSync('phase1-test-1749827213110.json', 'utf8')
  )
  
  const context = previousResults.context
  const searchResults = previousResults.executeResult.searchResults
  
  console.log('📋 前回のテスト結果を使用:')
  console.log(`検索結果数: ${searchResults.length}クエリ`)
  console.log(`総記事数: ${searchResults.reduce((sum, q) => sum + q.results.length, 0)}件`)
  console.log('')

  // Phase 1 - Integrate
  const startTime = Date.now()
  const integrateResult = await phase1Integrate(context, searchResults)
  const integrateDuration = Date.now() - startTime

  if (!integrateResult) {
    console.error('❌ Phase 1 Integrate失敗')
    return
  }

  console.log('\n📊 実行統計:')
  console.log(`Integrate所要時間: ${integrateDuration}ms`)
  console.log('\n📝 分析インサイト:')
  console.log(integrateResult.analysisInsights)
  console.log('\n➡️ 次のステップ:')
  console.log(integrateResult.nextStepMessage)

  // 結果を保存
  const results = {
    context,
    searchResults,
    integrateResult,
    metrics: {
      integrateDuration,
      totalTopics: integrateResult.extractedTopics?.length || 0,
      topOpportunities: integrateResult.topOpportunities?.length || 0
    },
    timestamp: new Date().toISOString()
  }

  const filename = `phase1-integrate-test-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testPhase1Complete().catch(console.error)