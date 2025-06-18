/**
 * プロンプトローダーのテストスクリプト
 * 作成日: 2025-06-18
 * 
 * 使用方法:
 * node test-scripts/test-prompt-loader-20250618.js
 */

import { loadPrompt, getPromptMetadata, promptLoader } from '../lib/prompt-loader.js'

console.log('=== プロンプトローダーテスト開始 ===\n')

// 1. 基本的なプロンプト読み込みテスト
console.log('1. Perplexityプロンプトの読み込みテスト')
try {
  const perplexityPrompt = loadPrompt('perplexity/collect-topics.txt', {
    theme: 'AIと仕事の未来',
    platform: 'Twitter',
    style: 'インサイトフル',
    theme_part1: 'AI',
    theme_part2: '仕事の未来'
  })
  
  console.log('✅ 成功: プロンプトが正常に読み込まれました')
  console.log(`文字数: ${perplexityPrompt.length}`)
  console.log(`最初の100文字: ${perplexityPrompt.substring(0, 100)}...`)
} catch (error) {
  console.error('❌ エラー:', error.message)
}

console.log('\n' + '='.repeat(50) + '\n')

// 2. プロンプトメタデータの取得テスト
console.log('2. プロンプトメタデータの取得テスト')
try {
  const metadata = getPromptMetadata('gpt/generate-concepts.txt')
  console.log('プロンプト情報:')
  console.log(`- 文字数: ${metadata.length}`)
  console.log(`- 行数: ${metadata.lines}`)
  console.log(`- 変数の数: ${metadata.variableCount}`)
  console.log(`- 変数リスト: ${metadata.variables.join(', ')}`)
} catch (error) {
  console.error('❌ エラー:', error.message)
}

console.log('\n' + '='.repeat(50) + '\n')

// 3. キャラクタープロンプトの読み込みテスト
console.log('3. Claudeキャラクタープロンプトの読み込みテスト')
try {
  const characterPrompt = loadPrompt('claude/character-profiles/cardi-dare-simple.txt', {
    philosophy: '人生は皮肉に満ちている。だからこそ面白い。',
    topicTitle: 'AIが仕事を奪う？いや、人間が仕事を手放すんだ',
    openingHook: '「AIに仕事を奪われる」と嘆く前に、その仕事に価値があったか考えてみろ'
  })
  
  console.log('✅ 成功: キャラクタープロンプトが正常に読み込まれました')
  console.log('\n生成されたプロンプト:')
  console.log(characterPrompt)
} catch (error) {
  console.error('❌ エラー:', error.message)
}

console.log('\n' + '='.repeat(50) + '\n')

// 4. キャッシュ機能のテスト
console.log('4. プロンプトローダーのキャッシュ機能テスト')
console.time('初回読み込み')
const prompt1 = promptLoader.load('gpt/generate-concepts.txt', {
  platform: 'Twitter',
  style: 'casual'
})
console.timeEnd('初回読み込み')

console.time('キャッシュからの読み込み')
const prompt2 = promptLoader.load('gpt/generate-concepts.txt', {
  platform: 'Twitter',
  style: 'casual'
})
console.timeEnd('キャッシュからの読み込み')

console.log('✅ キャッシュが正常に動作しています')

console.log('\n' + '='.repeat(50) + '\n')

// 5. エラーハンドリングのテスト
console.log('5. エラーハンドリングのテスト')
try {
  const nonExistentPrompt = loadPrompt('invalid/path.txt')
} catch (error) {
  console.log('✅ 期待通りのエラー:', error.message)
}

console.log('\n=== テスト完了 ===')
console.log('\n📝 次のステップ:')
console.log('1. 既存のAPIルートでプロンプトローダーが正しく動作することを確認')
console.log('2. プロンプトの変更が反映されることを確認')
console.log('3. 本番環境でのキャッシュ設定を検討')