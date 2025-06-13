#!/usr/bin/env node

/**
 * Phase 4: コンテンツ生成テスト
 * Phase 3で選ばれたコンセプトから実際の投稿コンテンツを生成
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')
const fs = require('fs')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function phase4ContentGeneration(context, selectedConcept) {
  console.log('✍️ Phase 4: 投稿準備完了コンテンツ生成中...\n')
  
  const prompt = `
あなたはバズるコンテンツ戦略家です。
以下のコンセプトから、実際に${context.platform}に投稿できる完全なコンテンツを作成してください。

# 選ばれたコンセプト
基となった機会: ${selectedConcept.opportunityBased}
形式: ${selectedConcept.framework.A_format}
フック: ${selectedConcept.framework.B_hook}
角度: ${selectedConcept.framework.C_angle}

# コンテンツ概要
${JSON.stringify(selectedConcept.contentOutline, null, 2)}

# ユーザー設定
* 発信したい分野: ${context.expertise}
* スタイル: ${context.style}
* プラットフォーム: ${context.platform}

# タスク
上記のコンセプトに基づいて、以下を作成してください：

1. **完全な投稿コンテンツ**
   - ${context.platform}の文字数制限を考慮
   - 各投稿は独立して読めるが、全体でストーリーを形成
   - 感情的なフックと論理的な説明のバランス

2. **投稿の構成**
   - オープニング（フック）
   - 本文（キーポイントの展開）
   - クロージング（CTA）

3. **エンゲージメント要素**
   - 質問や投票などのインタラクティブ要素
   - リツイート・シェアを促す要素
   - コメントを誘発する要素

# 出力形式（JSON）
{
  "content": {
    "format": "${selectedConcept.framework.A_format}",
    "posts": [
      {
        "number": 1,
        "type": "opening/body/closing",
        "text": "実際の投稿文（140-280字）",
        "media": "使用する画像・動画の説明（ある場合）",
        "engagement": "この投稿で狙うエンゲージメント"
      }
    ],
    "totalPosts": 数値,
    "estimatedReadTime": "全体を読むのにかかる時間"
  },
  "metadata": {
    "hashtags": ["使用するハッシュタグ"],
    "mentions": ["メンション候補（あれば）"],
    "bestPostingTime": "最適な投稿時間",
    "threadStrategy": "スレッドの場合の投稿間隔"
  },
  "performance": {
    "expectedEngagement": {
      "likes": "予想範囲",
      "retweets": "予想範囲",
      "comments": "予想範囲"
    },
    "viralProbability": 0.0-1.0,
    "reasoning": "なぜこの構成が効果的か"
  },
  "implementation": {
    "prePostChecklist": [
      "投稿前のチェック項目"
    ],
    "postActions": [
      "投稿後のフォローアップアクション"
    ],
    "monitoringPlan": "パフォーマンス監視の計画"
  }
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `バズるコンテンツ戦略家として、${context.platform}向けの完全で実行可能なコンテンツを作成してください。必ずJSON形式で応答してください。` 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    console.log(`✅ ${result.content?.totalPosts || 0}個の投稿を生成完了`)
    
    return result
  } catch (error) {
    console.error('❌ コンテンツ生成失敗:', error.message)
    return null
  }
}

async function testPhase4() {
  console.log('=== Phase 4: 投稿準備完了コンテンツ生成 ===\n')
  
  // Phase 3の結果を読み込む
  const phase3Results = JSON.parse(
    fs.readFileSync('phase3-original-1749828657042.json', 'utf8')
  )
  
  const context = phase3Results.context
  const concepts = phase3Results.generatedConcepts.concepts
  const bestConceptIndex = phase3Results.generatedConcepts.overallStrategy.bestOption - 1
  const selectedConcept = concepts[bestConceptIndex]
  
  console.log('📋 設定:')
  console.log(`発信したい分野: ${context.expertise}`)
  console.log(`プラットフォーム: ${context.platform}`)
  console.log(`スタイル: ${context.style}`)
  
  console.log('\n🎯 選ばれたコンセプト:')
  console.log(`「${selectedConcept.opportunityBased}」`)
  console.log(`形式: ${selectedConcept.framework.A_format}`)
  console.log(`角度: ${selectedConcept.framework.C_angle}`)
  console.log('')

  // コンテンツ生成
  const content = await phase4ContentGeneration(context, selectedConcept)
  
  if (!content) {
    console.error('コンテンツ生成に失敗しました')
    return
  }

  // 結果表示
  console.log('\n📝 生成されたコンテンツ:\n')
  console.log(`形式: ${content.content.format}`)
  console.log(`総投稿数: ${content.content.totalPosts}`)
  console.log(`推定読了時間: ${content.content.estimatedReadTime}`)
  console.log('\n' + '─'.repeat(60) + '\n')
  
  content.content.posts.forEach(post => {
    console.log(`【投稿${post.number} - ${post.type}】`)
    console.log(post.text)
    if (post.media) {
      console.log(`\n📷 メディア: ${post.media}`)
    }
    console.log(`💡 狙い: ${post.engagement}`)
    console.log('\n' + '─'.repeat(60) + '\n')
  })

  console.log('📊 メタデータ:')
  console.log(`ハッシュタグ: ${content.metadata.hashtags.join(' ')}`)
  if (content.metadata.mentions.length > 0) {
    console.log(`メンション: ${content.metadata.mentions.join(' ')}`)
  }
  console.log(`最適投稿時間: ${content.metadata.bestPostingTime}`)
  if (content.metadata.threadStrategy) {
    console.log(`スレッド戦略: ${content.metadata.threadStrategy}`)
  }

  console.log('\n📈 パフォーマンス予測:')
  console.log(`いいね: ${content.performance.expectedEngagement.likes}`)
  console.log(`リツイート: ${content.performance.expectedEngagement.retweets}`)
  console.log(`コメント: ${content.performance.expectedEngagement.comments}`)
  console.log(`バイラル確率: ${content.performance.viralProbability}`)
  console.log(`理由: ${content.performance.reasoning}`)

  console.log('\n✅ 実装計画:')
  console.log('投稿前チェックリスト:')
  content.implementation.prePostChecklist.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item}`)
  })
  console.log('\n投稿後アクション:')
  content.implementation.postActions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action}`)
  })
  console.log(`\n監視計画: ${content.implementation.monitoringPlan}`)

  // 実際の投稿形式で表示
  console.log('\n' + '═'.repeat(60))
  console.log('🐦 実際の投稿プレビュー:')
  console.log('═'.repeat(60) + '\n')
  
  content.content.posts.forEach((post, index) => {
    if (index > 0) console.log('↓')
    console.log(post.text)
    console.log('')
  })

  // 結果を保存
  const results = {
    context,
    selectedConcept,
    generatedContent: content,
    timestamp: new Date().toISOString()
  }

  const filename = `phase4-content-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`💾 結果を保存: ${filename}`)
}

// 実行
testPhase4().catch(console.error)