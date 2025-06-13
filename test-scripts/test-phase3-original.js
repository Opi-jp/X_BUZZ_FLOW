#!/usr/bin/env node

/**
 * Phase 3 オリジナルプロンプト版
 * コンテンツコンセプトフレームワークに基づく生成
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')
const fs = require('fs')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function phase3OriginalConcepts(context, selectedOpportunities) {
  console.log('🎨 Phase 3: オリジナルフレームワークでコンセプト生成...\n')
  
  const prompt = `
あなたはバズるコンテンツ戦略家です。
以下の機会から、バズるコンテンツコンセプトを作成してください。

# 選ばれたバズ機会
${selectedOpportunities.map((opp, i) => `
${i + 1}. ${opp.topicName}
   要約: ${opp.summary}
   バズ要素: ${opp.buzzElement}
   出典: ${opp.sources[0].url}
`).join('\n')}

# ユーザー設定
* 発信したい分野: ${context.expertise}
* スタイル: ${context.style}
* プラットフォーム: ${context.platform}

# コンテンツコンセプトフレームワーク
それぞれの機会について、以下を開発してください：

A: 形式: [スレッド/単発投稿/動画/画像付き投稿など]
B: フック: 「[注目を集める具体的なオープナー]」
C: 角度: [独自の視点や見方]

# コンテンツ概要
各コンセプトについて以下を含めてください：
- トレンドにつながるオープニングフック
- 物語を構築する3～5つのキーポイント
- 予期せぬ洞察や啓示
- エンゲージメントを促進するCTA（Call to Action）
- タイミング: 最大の効果を得るには [X] 時間以内に投稿
- ビジュアル: [具体的な画像/動画の説明]
- ハッシュタグ: [最適化されたタグ]

# 出力形式（JSON）
{
  "concepts": [
    {
      "opportunityBased": "元となった機会",
      "framework": {
        "A_format": "スレッド/単発投稿/動画など",
        "B_hook": "注目を集める具体的なオープナー（実際の投稿文）",
        "C_angle": "独自の視点（例：専門家視点、個人体験談、予測系など）"
      },
      "contentOutline": {
        "openingHook": "トレンドにつながるオープニングフック",
        "keyPoints": [
          "キーポイント1：具体的な内容",
          "キーポイント2：データや事例",
          "キーポイント3：深い洞察",
          "キーポイント4：意外な発見",
          "キーポイント5：締めの内容"
        ],
        "unexpectedInsight": "予期せぬ洞察や啓示",
        "cta": "エンゲージメントを促進するCTA"
      },
      "execution": {
        "timing": "最大の効果を得るには○時間以内に投稿（理由含む）",
        "visual": "具体的な画像/動画の説明",
        "hashtags": ["#タグ1", "#タグ2", "#タグ3"]
      },
      "viralPotential": {
        "score": 0.0-1.0,
        "reasoning": "なぜこれがバズるか"
      },
      "sourceReference": {
        "title": "参照元記事",
        "url": "必須：完全なURL"
      }
    }
  ],
  "overallStrategy": {
    "bestOption": 1-3,
    "reasoning": "なぜこのコンセプトが最も効果的か",
    "executionOrder": "複数投稿する場合の順序と理由"
  }
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'バズるコンテンツ戦略家として、オリジナルのコンテンツコンセプトフレームワークに従って、具体的で実行可能なコンテンツを作成してください。必ずJSON形式で応答してください。' 
        },
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

async function testPhase3Original() {
  console.log('=== Phase 3: オリジナルフレームワーク版 ===\n')
  
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
  const result = await phase3OriginalConcepts(context, selectedOpportunities)
  
  if (!result) {
    console.error('コンセプト生成に失敗しました')
    return
  }

  // 結果表示
  console.log('\n🎯 生成されたコンセプト:\n')
  
  result.concepts.forEach((concept, index) => {
    console.log(`━━━ コンセプト${index + 1} ━━━`)
    console.log(`基となった機会: ${concept.opportunityBased}`)
    console.log('\n【フレームワーク】')
    console.log(`A: 形式 = ${concept.framework.A_format}`)
    console.log(`B: フック = 「${concept.framework.B_hook}」`)
    console.log(`C: 角度 = ${concept.framework.C_angle}`)
    
    console.log('\n【コンテンツ概要】')
    console.log(`オープニング: ${concept.contentOutline.openingHook}`)
    console.log('\nキーポイント:')
    concept.contentOutline.keyPoints.forEach((point, i) => {
      console.log(`  ${i + 1}. ${point}`)
    })
    console.log(`\n予期せぬ洞察: ${concept.contentOutline.unexpectedInsight}`)
    console.log(`CTA: ${concept.contentOutline.cta}`)
    
    console.log('\n【実行詳細】')
    console.log(`タイミング: ${concept.execution.timing}`)
    console.log(`ビジュアル: ${concept.execution.visual}`)
    console.log(`ハッシュタグ: ${concept.execution.hashtags.join(' ')}`)
    
    console.log('\n【バイラルポテンシャル】')
    console.log(`スコア: ${concept.viralPotential.score}`)
    console.log(`理由: ${concept.viralPotential.reasoning}`)
    
    console.log('\n【出典】')
    console.log(`${concept.sourceReference.title}`)
    console.log(`${concept.sourceReference.url}`)
    console.log('\n' + '═'.repeat(60) + '\n')
  })

  console.log('📊 総合戦略:')
  console.log(`最も推奨: コンセプト${result.overallStrategy.bestOption}`)
  console.log(`理由: ${result.overallStrategy.reasoning}`)
  if (result.overallStrategy.executionOrder) {
    console.log(`実行順序: ${result.overallStrategy.executionOrder}`)
  }

  // 結果を保存
  const results = {
    context,
    selectedOpportunities,
    generatedConcepts: result,
    timestamp: new Date().toISOString()
  }

  const filename = `phase3-original-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testPhase3Original().catch(console.error)