#!/usr/bin/env node

/**
 * カスタム文体設定の例
 * インタラクティブUIのデモ
 */

// カスタム文体の設定例
const customToneExamples = {
  example1: {
    name: '大屋さん風（皮肉屋だけど情けもある）',
    basePersonality: 'ちょっと皮肉屋だけど、スジは通っていて情けもある感じ',
    speechPatterns: [
      '「〜なんだけどさ」という語尾を使う',
      '斜に構えた物言いだけど、最後は応援している',
      '世の中の矛盾をついつい指摘してしまう',
      'でも根は優しくて、人の可能性を信じている'
    ],
    emotionalTone: '温かみのある皮肉、愛のあるツッコミ',
    specialRules: [
      '最初は疑問を投げかける形で始める',
      '途中で「まあ、そうは言っても」的な転換を入れる',
      '最後は前向きなメッセージで締める',
      '専門用語は使うけど、すぐに分かりやすく言い換える'
    ],
    examples: [
      'AIが仕事を奪うって？まあ、退屈な作業から解放してくれるならありがたいけどね。',
      'みんな「効率化」って言うけどさ、本当に大事なのは「何のための効率化か」なんだよね。',
      'テクノロジーは便利だけど、結局使うのは人間。そこを忘れちゃいけない。'
    ]
  },
  example2: {
    name: 'ビジネスカジュアル専門家',
    basePersonality: '専門知識を持ちつつも、カフェで友達と話すような親しみやすさ',
    speechPatterns: [
      '「実はこれ、〜なんですよ」という説明の仕方',
      '専門用語の後にすぐ「つまり〜」と解説',
      '「知ってました？」で興味を引く'
    ],
    emotionalTone: '知的好奇心を刺激する、ワクワク感のある語り口',
    specialRules: [
      '難しい概念は身近な例えで説明',
      '数字やデータは必ず含める',
      '読者を「一緒に学ぶ仲間」として扱う'
    ],
    examples: [
      '実はAIって、私たちの脳の仕組みを真似してるんですよ。',
      'データによると、AIツールを使う企業の生産性は平均30%向上。つまり、8時間の仕事が5.5時間で終わるってこと。'
    ]
  }
}

// プロンプト生成関数
function generateCustomPrompt(customTone) {
  return `
# カスタム文体設定

## 基本的な人格
${customTone.basePersonality}

## 感情的トーン
${customTone.emotionalTone}

## 話し方の特徴
${customTone.speechPatterns.map(p => `- ${p}`).join('\n')}

## 特別なルール
${customTone.specialRules.map(r => `- ${r}`).join('\n')}

## 文体の例
${customTone.examples.map((e, i) => `例${i + 1}: "${e}"`).join('\n')}
`
}

// リライト例のシミュレーション
function simulateRewrite(originalPost, customTone) {
  // オリジナルの内容から要素を抽出
  const hasData = originalPost.includes('%') || originalPost.includes('調査')
  const hasQuestion = originalPost.includes('？')
  const hasCTA = originalPost.includes('コメント') || originalPost.includes('シェア')
  
  // カスタム文体に基づいてリライト
  if (customTone.name.includes('皮肉屋')) {
    return originalPost
      .replace(/知っていますか？/, 'って知ってた？まあ、知らなくても困らないかもしれないけどさ。')
      .replace(/驚きの事実/, 'ちょっと驚くかもしれない話')
      .replace(/！/, '。まあ、そういうことなんだけどね。')
      .replace(/ぜひ/, 'よかったら')
      .replace(/革命的/, '結構すごい（らしい）')
  } else {
    return originalPost
      .replace(/知っていますか？/, 'って知ってました？実はこれ、')
      .replace(/驚きの/, 'これがまた面白くて、')
      .replace(/！/, '！つまり、')
  }
}

// デモ実行
console.log('=== カスタム文体設定デモ ===\n')

// カスタム文体の例を表示
console.log('📝 カスタム文体の設定例:\n')

Object.values(customToneExamples).forEach((example, i) => {
  console.log(`【例${i + 1}: ${example.name}】`)
  console.log(generateCustomPrompt(example))
  console.log('─'.repeat(60) + '\n')
})

// リライトのシミュレーション
console.log('🔄 リライトシミュレーション:\n')

const samplePost = `🌟AIが未来の働き方を革命！AIエージェントがどのように私たちの仕事を変えるか、知っていますか？最新の調査では、AIツール導入企業の生産性が30%向上！驚きの事実を今すぐチェック！ #AI #働き方革命 #未来の仕事`

console.log('【オリジナル】')
console.log(samplePost)
console.log('')

Object.values(customToneExamples).forEach((example, i) => {
  console.log(`【${example.name}版】`)
  console.log(simulateRewrite(samplePost, example))
  console.log('')
})

// UI操作のガイド
console.log('─'.repeat(60))
console.log('\n💡 実際のUI操作の流れ:\n')
console.log('1. プリセット選択 or カスタム作成')
console.log('2. カスタムの場合:')
console.log('   - 基本的な人格を入力')
console.log('   - 話し方の特徴を複数入力')
console.log('   - 感情的トーンを設定')
console.log('   - 特別なルールを追加')
console.log('   - 文体の例を提供')
console.log('3. リライト実行')
console.log('4. Before/After比較表示')
console.log('5. 結果をJSON保存')

console.log('\n📌 重要な制約:')
console.log('- オープニングフックは必ず維持')
console.log('- CTAは必ず含める')
console.log('- 各投稿の役割（opening/body/closing）は厳守')
console.log('- 核心メッセージは変えない')
console.log('- 構造は崩さない')

// 保存形式の例
const exampleOutput = {
  customToneSettings: customToneExamples.example1,
  prompt: generateCustomPrompt(customToneExamples.example1),
  constraints: [
    '構造維持（オープニング、本文、CTA）',
    '核心メッセージの保持',
    'データと具体例の維持',
    '教育的価値の維持'
  ]
}

console.log('\n📁 保存されるデータ形式:')
console.log(JSON.stringify(exampleOutput, null, 2).substring(0, 500) + '...')

console.log('\n✅ カスタム文体機能の実装完了！')