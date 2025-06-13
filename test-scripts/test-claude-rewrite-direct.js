#!/usr/bin/env node

/**
 * Claude リライト直接実行版
 * カスタム文体を直接指定してテスト
 */

require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

// 大屋さん風カスタム文体
const customToneInstructions = `
# カスタム文体設定

## 基本的な人格
ちょっと皮肉屋だけど、根はすごく優しい。世の中を斜めから見ているけど、結局みんなのことを応援している

## 感情的トーン
温かい皮肉、愛のあるツッコミ

## 話し方の特徴
- 「〜なんだけどさ」をよく使う
- 「まあ、そうは言っても」で転換する
- 世の中の矛盾をさりげなくツッコむ
- でも最後は必ず前向きに締める

## 特別なルール
- データや専門用語は噛み砕いて説明する
- 読者を見下さない、一緒に考える姿勢
- 難しいことをさらっと言うけど、すぐフォローする

## 文体の例
例1: "みんなAI怖いって言うけどさ、怖いのはAIじゃなくて変化そのものなんだよね"
例2: "効率化って聞こえはいいけど、結局「何のため？」が大事でしょ"
例3: "テクノロジーは便利。でも使うのは人間。そこ忘れちゃダメなんだよね"
`

async function claudeRewrite(originalContent, context, toneInstructions) {
  console.log('🤖 Claude: カスタム文体でリライト中...\n')
  
  const prompt = `
あなたは熟練のコピーライターです。
以下のGPTが生成したTwitter投稿を、指定された文体でリライトしてください。

# ユーザー設定
* 発信したい分野: ${context.expertise}
* スタイル: ${context.style}
* プラットフォーム: ${context.platform}

# オリジナル投稿（GPT作成）
${originalContent.map((post, i) => `
投稿${i + 1}:
${post.text}
`).join('\n')}

# 文体指定
${toneInstructions}

# リライトの重要な制約
1. **構造は必ず維持**
   - オープニングフックは必ず残す（表現は変えてOK）
   - 本文の流れと論理構造は崩さない
   - CTAは必ず含める（表現は変えてOK）
   - 各投稿の役割（opening/body/closing）は厳守

2. **核心メッセージの保持**
   - 伝えたい内容の本質は変えない
   - データや具体例は残す
   - 教育的価値は維持

3. **文体の適用**
   - 指定された文体を全体に適用
   - でも構造と内容の本質は守る
   - 自然な日本語で

4. **エンゲージメント要素**
   - 読者の興味を引く要素は強化
   - 共感を呼ぶ表現に
   - 文字数は元の投稿と同程度

# 出力形式
各投稿を以下の形式でリライトしてください：

【投稿1】
（リライトした文章）

【投稿2】
（リライトした文章）

...以下同様

# 重要
- ハッシュタグは維持または改善
- より「人間らしい」文章に
- 指定された文体を徹底的に反映する
- でも基本構造は絶対に崩さない`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return message.content[0].text
  } catch (error) {
    console.error('❌ Claudeリライト失敗:', error.message)
    return null
  }
}

async function testCustomTone() {
  console.log('=== カスタム文体リライトテスト ===\n')
  
  // Phase 4の結果を読み込む
  const phase4Results = JSON.parse(
    fs.readFileSync('phase4-content-1749829179330.json', 'utf8')
  )
  
  const context = phase4Results.context
  const originalPosts = phase4Results.generatedContent.content.posts
  
  console.log('📋 設定:')
  console.log(`発信したい分野: ${context.expertise}`)
  console.log(`プラットフォーム: ${context.platform}`)
  console.log(`スタイル: ${context.style}`)
  console.log(`投稿数: ${originalPosts.length}`)
  
  console.log('\n🎨 カスタム文体: 大屋さん風（ちょっと皮肉屋だけど優しい）')
  
  // リライト実行
  const rewrittenContent = await claudeRewrite(
    originalPosts, 
    context, 
    customToneInstructions
  )
  
  if (!rewrittenContent) {
    console.error('リライトに失敗しました')
    return
  }

  console.log('\n✅ リライト完了\n')
  console.log('═'.repeat(60))
  console.log('📝 カスタム文体でのリライト結果')
  console.log('═'.repeat(60))
  console.log(rewrittenContent)
  
  // 特徴的な表現を抽出
  console.log('\n🔍 文体の特徴分析:')
  const features = {
    'なんだけどさ': (rewrittenContent.match(/なんだけどさ/g) || []).length,
    'まあ': (rewrittenContent.match(/まあ/g) || []).length,
    '〜だよね': (rewrittenContent.match(/だよね/g) || []).length,
    '？': (rewrittenContent.match(/？/g) || []).length,
    'でも': (rewrittenContent.match(/でも/g) || []).length,
  }
  
  Object.entries(features).forEach(([feature, count]) => {
    if (count > 0) {
      console.log(`- 「${feature}」: ${count}回使用`)
    }
  })

  // 結果を保存
  const results = {
    context,
    customTone: {
      name: '大屋さん風（ちょっと皮肉屋だけど優しい）',
      instructions: customToneInstructions
    },
    original: {
      posts: originalPosts,
    },
    rewritten: {
      content: rewrittenContent,
      timestamp: new Date().toISOString()
    },
    metadata: {
      originalModel: 'gpt-4o',
      rewriteModel: 'claude-3-haiku-20240307',
      purpose: 'カスタム文体（皮肉屋だけど優しい）でのリライト'
    }
  }

  const filename = `claude-rewrite-custom-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testCustomTone().catch(console.error)