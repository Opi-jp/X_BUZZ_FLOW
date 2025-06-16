// Phase 1 Thinkプロンプトのテスト
import { Phase1Strategy } from './lib/orchestrated-cot-strategy.js'

// テスト用のコンテキスト
const testContext = {
  expertise: 'AIと働き方',
  style: '教育的',
  platform: 'Twitter'
}

// プロンプトを表示
const prompt = Phase1Strategy.think.prompt.replace(/{(\w+)}/g, (match, key) => {
  return testContext[key] || match
})

console.log('=== Phase 1 Think プロンプト ===')
console.log(prompt)
console.log('\n=== 期待される出力形式 ===')
console.log(`
- A〜Dの各カテゴリから検索クエリを生成
- 合計5〜10個程度のクエリ
- 各クエリには英語版と日本語版
- バイラルポテンシャルの6軸評価
`)