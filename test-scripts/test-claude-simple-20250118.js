#!/usr/bin/env node

/**
 * Claudeプロンプトの簡易テスト
 */

const { loadPrompt } = require('../lib/prompt-loader.ts')

// モックデータ
const mockCharacter = {
  name: "カーディ・ダーレ",
  age: "53",
  gender: "男性",
  philosophy: "AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから",
  voiceMode: "normal"
}

const mockConcept = {
  conceptTitle: "AIが変える意外な働き方の真実",
  hookType: "意外性",
  angle: "逆張りする視点",
  structure: {
    openingHook: "『AIで仕事がなくなる』と騒ぐ人ほど、実はAIを使っていない衝撃の事実",
    background: "メディアは『AIが雇用を奪う』と煽るが、現場で起きているのは真逆の現象",
    mainContent: "実際にAIを導入した企業では、人間の仕事が『増えている』。なぜか？AIが処理した膨大なデータを『解釈』し『判断』する高度な仕事が生まれたから",
    reflection: "結局、AIは人間の仕事を奪うのではなく、仕事の質を変えているだけ",
    cta: "あなたの職場でも似たような変化はありませんか？"
  }
}

// プロンプトを展開
const prompt = loadPrompt('claude/character-default.txt', {
  characterName: mockCharacter.name,
  characterAge: mockCharacter.age,
  characterGender: mockCharacter.gender,
  characterPhilosophy: mockCharacter.philosophy,
  voiceModeInstruction: '',
  topicTitle: mockConcept.conceptTitle,
  conceptStructure: JSON.stringify(mockConcept.structure, null, 2)
})

console.log('📝 展開されたプロンプト:')
console.log('='.repeat(80))
console.log(prompt)
console.log('='.repeat(80))

console.log('\n✨ このプロンプトで期待される出力:')
console.log('- 140文字程度のTwitter投稿')
console.log('- カーディ・ダーレのキャラクター（皮肉屋、冷静）で')
console.log('- AIと働き方についての洞察を含む')
console.log('- 感情的な共感を呼ぶ内容')

// カーディ専用プロンプトも確認
console.log('\n\n📝 カーディ専用プロンプト（シンプル版）:')
console.log('='.repeat(80))

const cardiPrompt = loadPrompt('claude/character-profiles/cardi-dare-simple.txt', {
  philosophy: mockCharacter.philosophy,
  topicTitle: mockConcept.conceptTitle,
  openingHook: mockConcept.structure.openingHook
})

console.log(cardiPrompt)
console.log('='.repeat(80))

console.log('\n💡 プロンプトエディターでの改善ポイント:')
console.log('1. モックデータを使って即座にテスト可能')
console.log('2. 実際のAPI呼び出しで結果を確認')
console.log('3. 良い結果はモックとして保存')
console.log('4. Chain of Thought原則に基づいた分析')

console.log('\n🚀 実行方法:')
console.log('node scripts/dev-tools/prompt-editor.js test claude/character-default.txt')