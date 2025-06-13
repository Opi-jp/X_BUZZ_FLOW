#!/usr/bin/env node

/**
 * Claude リライト UI版
 * カスタマイズ可能な文体設定でリライト
 */

require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const readline = require('readline')

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

// プリセット文体
const presetTones = {
  'neutral': {
    name: '自然で親しみやすい',
    description: '標準的な丁寧さと親しみやすさのバランス',
    instructions: ''
  },
  'sarcastic-but-kind': {
    name: '皮肉屋だけど優しい',
    description: '斜に構えているようで実は温かい',
    instructions: `
- 表面的には皮肉っぽい言い回しを使う
- でも根底には優しさと理解がある
- 「まあ、そうなんだけどさ」「〜なんだけどね」みたいな語尾
- 世の中を斜めから見ているけど、結局は応援している感じ`
  },
  'casual-expert': {
    name: 'カジュアル専門家',
    description: 'カジュアルだけど専門性を感じさせる',
    instructions: `
- 専門用語を使いつつも、友達に説明するような口調
- 「〜っていうのがあってさ」「実はこれ、〜なんだよね」
- 難しいことをさらっと言う`
  },
  'storyteller': {
    name: 'ストーリーテラー',
    description: '物語を語るような引き込まれる文章',
    instructions: `
- 体験談のように語る
- 「あの時〜」「実際に見たんだけど」
- 読者を物語に引き込む`
  },
  'provocative': {
    name: '挑発的真実',
    description: '挑発的だけど的を射ている',
    instructions: `
- 常識に疑問を投げかける
- 「本当にそうかな？」「みんな勘違いしてるけど」
- でも最後は建設的な提案で締める`
  }
}

// カスタム文体設定
class ToneCustomizer {
  constructor() {
    this.customTone = {
      name: 'カスタム',
      basePersonality: '',
      speechPatterns: [],
      emotionalTone: '',
      specialRules: [],
      examples: []
    }
  }

  async interactive() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve)
    })

    console.log('\n📝 カスタム文体設定')
    console.log('━'.repeat(50))

    // 基本的な人格
    this.customTone.basePersonality = await question(
      '\n基本的な人格・性格を入力してください（例：皮肉屋だけど根は優しい）:\n> '
    )

    // 話し方のパターン
    console.log('\n話し方の特徴を入力してください（空行で終了）:')
    let pattern
    while ((pattern = await question('> ')) !== '') {
      if (pattern) this.customTone.speechPatterns.push(pattern)
    }

    // 感情的なトーン
    this.customTone.emotionalTone = await question(
      '\n感情的なトーン（例：温かい、冷静、情熱的）:\n> '
    )

    // 特別なルール
    console.log('\n特別なルール（例：必ず疑問形で終わる）（空行で終了）:')
    let rule
    while ((rule = await question('> ')) !== '') {
      if (rule) this.customTone.specialRules.push(rule)
    }

    // 例文
    console.log('\n文体の例（空行で終了）:')
    let example
    while ((example = await question('> ')) !== '') {
      if (example) this.customTone.examples.push(example)
    }

    rl.close()
    return this.generateInstructions()
  }

  generateInstructions() {
    let instructions = `
# カスタム文体設定

## 基本的な人格
${this.customTone.basePersonality}

## 感情的トーン
${this.customTone.emotionalTone}
`

    if (this.customTone.speechPatterns.length > 0) {
      instructions += `
## 話し方の特徴
${this.customTone.speechPatterns.map(p => `- ${p}`).join('\n')}
`
    }

    if (this.customTone.specialRules.length > 0) {
      instructions += `
## 特別なルール
${this.customTone.specialRules.map(r => `- ${r}`).join('\n')}
`
    }

    if (this.customTone.examples.length > 0) {
      instructions += `
## 文体の例
${this.customTone.examples.map((e, i) => `例${i + 1}: "${e}"`).join('\n')}
`
    }

    return instructions
  }
}

async function claudeRewrite(originalContent, context, toneInstructions) {
  console.log('\n🤖 Claude: コンテンツをリライト中...\n')
  
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

async function selectTone() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve)
  })

  console.log('\n📝 文体選択')
  console.log('━'.repeat(50))
  console.log('\nプリセット文体:')
  
  const presetKeys = Object.keys(presetTones)
  presetKeys.forEach((key, i) => {
    console.log(`${i + 1}. ${presetTones[key].name} - ${presetTones[key].description}`)
  })
  console.log(`${presetKeys.length + 1}. カスタム文体を作成`)

  const choice = await question('\n選択してください (番号): ')
  rl.close()

  const choiceNum = parseInt(choice)
  
  if (choiceNum > 0 && choiceNum <= presetKeys.length) {
    const selectedKey = presetKeys[choiceNum - 1]
    return {
      name: presetTones[selectedKey].name,
      instructions: presetTones[selectedKey].instructions || ''
    }
  } else if (choiceNum === presetKeys.length + 1) {
    const customizer = new ToneCustomizer()
    const customInstructions = await customizer.interactive()
    return {
      name: 'カスタム',
      instructions: customInstructions
    }
  } else {
    console.log('無効な選択です。デフォルト（neutral）を使用します。')
    return {
      name: presetTones.neutral.name,
      instructions: ''
    }
  }
}

async function displayComparison(original, rewritten, context) {
  console.log('\n' + '═'.repeat(60))
  console.log('📊 Before/After 比較')
  console.log('═'.repeat(60))
  
  const originalPosts = original.split('\n\n')
  const rewrittenPosts = rewritten.match(/【投稿\d+】\n(.+?)(?=【投稿|$)/gs) || []
  
  for (let i = 0; i < Math.min(originalPosts.length, rewrittenPosts.length); i++) {
    console.log(`\n--- 投稿${i + 1} ---`)
    console.log('【オリジナル】')
    console.log(originalPosts[i])
    console.log('\n【リライト版】')
    console.log(rewrittenPosts[i].replace(/【投稿\d+】\n/, '').trim())
    console.log('')
  }
}

async function testClaudeRewriteUI() {
  console.log('=== Claude リライトUI版テスト ===\n')
  
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

  // 文体選択
  const selectedTone = await selectTone()
  
  console.log(`\n選択された文体: ${selectedTone.name}`)
  
  // リライト実行
  const rewrittenContent = await claudeRewrite(
    originalPosts, 
    context, 
    selectedTone.instructions
  )
  
  if (!rewrittenContent) {
    console.error('リライトに失敗しました')
    return
  }

  console.log('\n✅ リライト完了\n')
  console.log('═'.repeat(60))
  console.log('📝 リライト結果')
  console.log('═'.repeat(60))
  console.log(rewrittenContent)
  
  // オリジナルとの比較表示
  const originalText = originalPosts.map(p => p.text).join('\n\n')
  await displayComparison(originalText, rewrittenContent, context)

  // 結果を保存
  const results = {
    context,
    original: {
      posts: originalPosts,
      text: originalText
    },
    rewritten: {
      toneName: selectedTone.name,
      toneInstructions: selectedTone.instructions,
      content: rewrittenContent,
      timestamp: new Date().toISOString()
    },
    metadata: {
      originalModel: 'gpt-4o',
      rewriteModel: 'claude-3-haiku-20240307',
      purpose: 'カスタマイズ可能な文体でのリライト'
    }
  }

  const filename = `claude-rewrite-ui-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testClaudeRewriteUI().catch(console.error)