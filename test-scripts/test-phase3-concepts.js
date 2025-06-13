#!/usr/bin/env node

/**
 * Phase 3 コンセプト立案のテスト
 * Phase 1の結果を受けて、バズるコンテンツコンセプトを生成
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')
const fs = require('fs')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function phase3ConceptGeneration(context, selectedOpportunities) {
  console.log('🎨 Phase 3: コンセプト立案中...\n')
  
  // Phase 1の結果から選ばれた機会を整形
  const opportunitiesText = selectedOpportunities.map((opp, i) => 
    `${i + 1}. ${opp.topicName}\n   - ${opp.summary}\n   - バズ要素: ${opp.buzzElement}\n   - 出典: ${opp.sources[0].url}`
  ).join('\n\n')

  const prompt = `
あなたはバズるコンテンツ戦略家です。
以下の情報から、${context.platform}向けのバズるコンテンツコンセプトを3つ作成してください。

# 選ばれたバズ機会
${opportunitiesText}

# ユーザー設定
* 発信したい分野: ${context.expertise}
* スタイル: ${context.style}
* プラットフォーム: ${context.platform}

# コンセプト作成の指針

## 1. 角度（アングル）の種類
- 反論・議論系：世論に異議を唱える
- 専門家視点：内部からの洞察
- 個人体験談：共感を呼ぶストーリー
- 教育系：わかりやすく解説
- 予測系：未来を予想する
- 舞台裏系：知られざる真実
- 比較系：過去と現在の対比

## 2. ${context.platform}で効果的な形式
- スレッド形式（連続投稿）
- 単発投稿（インパクト重視）
- 画像付き投稿
- 引用リツイート活用

## 3. 感情トリガーの活用
選ばれた機会の感情要素を最大限に活かす

# 出力形式（JSON）
{
  "concepts": [
    {
      "number": 1,
      "title": "キャッチーなコンセプトタイトル",
      "basedOn": "元となったバズ機会",
      "format": "スレッド/単発/画像付き等",
      "hook": "最初の1行で注目を集める具体的な文章（実際の投稿文）",
      "angle": "選んだ角度とその理由",
      "mainContent": {
        "opening": "オープニング投稿（140字以内）",
        "body": [
          "本文1（具体例や統計）",
          "本文2（深掘り）",
          "本文3（意外な視点）"
        ],
        "closing": "締めの投稿（CTA含む）"
      },
      "hashtags": ["関連ハッシュタグ3-5個"],
      "expectedReaction": "期待される反応",
      "viral": {
        "score": 0.0-1.0,
        "reasoning": "なぜバズると考えるか"
      },
      "source": {
        "title": "参照元記事",
        "url": "必須：完全なURL"
      }
    }
  ],
  "recommendation": {
    "bestConcept": 1-3,
    "timing": "投稿に最適な時間帯と理由",
    "strategy": "投稿戦略のアドバイス"
  }
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'バズるコンテンツ戦略家として、実際に投稿可能な具体的なコンテンツを作成してください。必ずJSON形式で応答してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    console.log(`✅ ${result.concepts?.length || 0}個のコンセプト生成完了`)
    
    return result
  } catch (error) {
    console.error('❌ コンセプト生成失敗:', error.message)
    return null
  }
}

async function testPhase3() {
  console.log('=== Phase 3: コンセプト立案テスト ===\n')
  
  // Phase 1の結果を読み込む
  const phase1Results = JSON.parse(
    fs.readFileSync('phase1-formatted-1749828210319.json', 'utf8')
  )
  
  const context = phase1Results.context
  const selectedOpportunities = phase1Results.analysis.extractedTopics
  
  console.log('📋 設定:')
  console.log(`発信したい分野: ${context.expertise}`)
  console.log(`プラットフォーム: ${context.platform}`)
  console.log(`スタイル: ${context.style}`)
  
  console.log('\n📌 選ばれたバズ機会:')
  selectedOpportunities.forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.topicName} (${opp.buzzElement})`)
  })
  console.log('')

  // コンセプト生成
  const concepts = await phase3ConceptGeneration(context, selectedOpportunities)
  
  if (!concepts) {
    console.error('コンセプト生成に失敗しました')
    return
  }

  // 結果表示
  console.log('\n🎯 生成されたコンセプト:\n')
  
  concepts.concepts.forEach(concept => {
    console.log(`【コンセプト${concept.number}: ${concept.title}】`)
    console.log(`基となった機会: ${concept.basedOn}`)
    console.log(`形式: ${concept.format}`)
    console.log(`角度: ${concept.angle}`)
    console.log(`\nフック: "${concept.hook}"`)
    console.log(`\n投稿内容:`)
    console.log(`[オープニング] ${concept.mainContent.opening}`)
    concept.mainContent.body.forEach((content, i) => {
      console.log(`[${i + 1}] ${content}`)
    })
    console.log(`[締め] ${concept.mainContent.closing}`)
    console.log(`\nハッシュタグ: ${concept.hashtags ? concept.hashtags.join(' ') : 'なし'}`)
    console.log(`期待される反応: ${concept.expectedReaction}`)
    console.log(`バイラルスコア: ${concept.viral.score} - ${concept.viral.reasoning}`)
    console.log(`出典: ${concept.source.url}`)
    console.log('\n' + '='.repeat(60) + '\n')
  })

  console.log('💡 推奨事項:')
  console.log(`最も推奨: コンセプト${concepts.recommendation.bestConcept}`)
  console.log(`投稿時間: ${concepts.recommendation.timing}`)
  console.log(`戦略: ${concepts.recommendation.strategy}`)

  // 結果を保存
  const results = {
    context,
    selectedOpportunities,
    concepts,
    timestamp: new Date().toISOString()
  }

  const filename = `phase3-concepts-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testPhase3().catch(console.error)