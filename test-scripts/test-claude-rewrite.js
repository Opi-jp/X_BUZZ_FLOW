#!/usr/bin/env node

/**
 * Claude リライトテスト
 * GPTが生成したコンテンツをClaudeが改善
 */

require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

// 文体の定義をグローバルに移動
const toneDescriptions = {
  'neutral': '自然で親しみやすい文章',
  'sarcastic-but-kind': '皮肉屋だけどスジは通っていて情けもある感じ。斜に構えているようで実は温かい',
  'professional': 'プロフェッショナルで信頼感のある文章',
  'casual-expert': 'カジュアルだけど専門性を感じさせる文章',
  'storyteller': '物語を語るような引き込まれる文章',
  'provocative': '挑発的だけど的を射ている文章'
}

const toneInstructions = {
  'sarcastic-but-kind': `
- 表面的には皮肉っぽい言い回しを使う
- でも根底には優しさと理解がある
- 「まあ、そうなんだけどさ」「〜なんだけどね」みたいな語尾
- 世の中を斜めから見ているけど、結局は応援している感じ
- 例: "AIが仕事を奪うって？まあ、退屈な仕事から解放してくれるならありがたいけどね"`,
  'casual-expert': `
- 専門用語を使いつつも、友達に説明するような口調
- 「〜っていうのがあってさ」「実はこれ、〜なんだよね」
- 難しいことをさらっと言う`,
  'storyteller': `
- 体験談のように語る
- 「あの時〜」「実際に見たんだけど」
- 読者を物語に引き込む`,
  'provocative': `
- 常識に疑問を投げかける
- 「本当にそうかな？」「みんな勘違いしてるけど」
- でも最後は建設的な提案で締める`
}

async function claudeRewrite(originalContent, context, tone = 'neutral') {
  console.log('🤖 Claude: コンテンツをリライト中...\n')
  console.log(`文体: ${tone} - ${toneDescriptions[tone] || toneDescriptions.neutral}\n`)
  
  // 文体の定義
  // この定義は claudeRewrite 関数内でのみ使用されるため、関数内に残す
  
  // 文体別の詳細な指示を構築
  const toneInstruction = tone !== 'neutral' ? `

# 文体指定: ${toneDescriptions[tone] || toneDescriptions.neutral}
${toneInstructions[tone] || ''}` : ''

  const prompt = `
あなたは熟練のコピーライターです。
以下のGPTが生成したTwitter投稿を、より魅力的で自然な文章にリライトしてください。

# ユーザー設定
* 発信したい分野: ${context.expertise}
* スタイル: ${context.style}
* プラットフォーム: ${context.platform}

# オリジナル投稿（GPT作成）
${originalContent.map((post, i) => `
投稿${i + 1}:
${post.text}
`).join('\n')}
${toneInstruction}

# リライトの指針
1. **自然な日本語**
   - 硬い表現を柔らかく
   - 専門用語は残しつつ、親しみやすく
   - 絵文字は適度に（使いすぎない）

2. **エンゲージメント向上**
   - より共感を呼ぶ表現に
   - 具体例や数字を効果的に使用
   - 読者が反応したくなる問いかけ

3. **ストーリー性の強化**
   - 投稿間のつながりを自然に
   - 起承転結を意識
   - 読み進めたくなる流れ

4. **${context.style}スタイルの徹底**
   - 教育的：わかりやすく、学びがある
   - エンターテイメント：楽しく、驚きがある
   - 解説：論理的で、納得感がある

# 出力形式
各投稿を以下の形式でリライトしてください：

【投稿1】
（リライトした文章）

【投稿2】
（リライトした文章）

...以下同様

# 重要
- 文字数は元の投稿と同程度に
- ハッシュタグは維持または改善
- 核心的なメッセージは変えない
- より「人間らしい」文章に${tone !== 'neutral' ? '\n- 指定された文体を徹底的に反映する' : ''}`

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

async function compareVersions(original, rewritten, context) {
  console.log('\n📊 GPT vs Claude 比較分析中...')
  
  const analysisPrompt = `
以下の2つのバージョンを比較して、改善点を分析してください。

# オリジナル（GPT）
${original}

# リライト版（Claude）
${rewritten}

# 分析項目
1. 自然さの向上度
2. エンゲージメント要素の改善
3. ストーリー性の向上
4. ${context.style}スタイルの適合度

簡潔に分析結果をまとめてください。`

  try {
    const analysis = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: analysisPrompt
        }
      ]
    })

    return analysis.content[0].text
  } catch (error) {
    console.error('❌ 比較分析失敗:', error.message)
    return null
  }
}

async function testClaudeRewrite() {
  console.log('=== Claude リライトテスト ===\n')
  
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
  console.log('')

  // 文体オプションを表示
  console.log('📝 利用可能な文体:')
  Object.entries(toneDescriptions).forEach(([key, desc]) => {
    console.log(`  - ${key}: ${desc}`)
  })
  console.log('')

  // まずはneutralでテスト
  console.log('\n=== 1. ニュートラル文体でリライト ===\n')
  const rewrittenNeutral = await claudeRewrite(originalPosts, context, 'neutral')
  
  if (!rewrittenNeutral) {
    console.error('ニュートラルリライトに失敗しました')
    return
  }

  console.log('\n=== 2. 皮肉屋だけど優しい文体でリライト ===\n')
  const rewrittenSarcastic = await claudeRewrite(originalPosts, context, 'sarcastic-but-kind')
  
  if (!rewrittenSarcastic) {
    console.error('皮肉屋リライトに失敗しました')
    return
  }

  // 結果表示
  console.log('\n' + '═'.repeat(60))
  console.log('📝 ニュートラル版')
  console.log('═'.repeat(60))
  console.log(rewrittenNeutral)
  
  console.log('\n' + '═'.repeat(60))
  console.log('😏 皮肉屋だけど優しい版')
  console.log('═'.repeat(60))
  console.log(rewrittenSarcastic)
  
  // オリジナルとリライト版の比較
  const originalText = originalPosts.map(p => p.text).join('\n\n')
  console.log('\n📊 文体比較分析中...')
  
  const comparisonNeutral = await compareVersions(originalText, rewrittenNeutral, context)
  const comparisonSarcastic = await compareVersions(originalText, rewrittenSarcastic, context)
  
  if (comparisonNeutral) {
    console.log('\n═'.repeat(60))
    console.log('🔍 ニュートラル版の分析')
    console.log('═'.repeat(60))
    console.log(comparisonNeutral)
  }
  
  if (comparisonSarcastic) {
    console.log('\n═'.repeat(60))
    console.log('🔍 皮肉屋版の分析')
    console.log('═'.repeat(60))
    console.log(comparisonSarcastic)
  }

  // 結果を保存
  const results = {
    context,
    original: {
      posts: originalPosts,
      text: originalText
    },
    rewritten: {
      neutral: {
        content: rewrittenNeutral,
        analysis: comparisonNeutral
      },
      sarcasticButKind: {
        content: rewrittenSarcastic,
        analysis: comparisonSarcastic
      },
      timestamp: new Date().toISOString()
    },
    metadata: {
      originalModel: 'gpt-4o',
      rewriteModel: 'claude-3-haiku-20240307',
      purpose: 'より自然で魅力的な文章への改善',
      testedTones: ['neutral', 'sarcastic-but-kind']
    }
  }

  const filename = `claude-rewrite-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testClaudeRewrite().catch(console.error)