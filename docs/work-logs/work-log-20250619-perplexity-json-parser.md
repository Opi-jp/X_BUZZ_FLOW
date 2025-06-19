# 作業ログ: Perplexity JSON Parser改善 (2025-06-19)

## 実施した作業

### 1. Perplexity APIレスポンスのJSON抽出改善

#### 問題
- PerplexityがMarkdown形式で複数のJSONブロックを返すケース
- 既存の実装は単一のJSONオブジェクトのみを抽出
- `### トピック1:` のようなヘッダー付きの複数JSONブロックに対応できない

#### 解決策
`/app/api/generation/content/sessions/[id]/collect/route.ts` を更新:

1. **複数JSONブロックの抽出**
   - ` ```json` コードブロックを優先的に検索
   - コードブロックがない場合は、プレーンなJSONオブジェクトを検索
   - 全てのJSONブロックを配列に収集

2. **柔軟なデータ構造対応**
   - `{ topic: {...} }` - 単一トピックオブジェクト
   - `{ topics: [...] }` - トピック配列を含むオブジェクト
   - `[{...}, {...}]` - 直接的なトピック配列
   - その他 - 全体を1つのトピックとして扱う

3. **エラーハンドリング**
   - 各JSONブロックのパースエラーを個別にキャッチ
   - 1つのブロックが失敗しても他のブロックの処理を継続
   - 最終的に0個のJSONブロックしか抽出できなかった場合のみエラー

#### 技術的詳細
```javascript
// 新しいJSON抽出ロジック
const jsonCodeBlockRegex = /```json\s*\n([\s\S]*?)\n```/g
const plainJsonRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g

// 結果の統合
for (const block of jsonBlocks) {
  if (block.topic) {
    topicsData.topics.push(block)
  } else if (block.topics && Array.isArray(block.topics)) {
    topicsData.topics.push(...block.topics)
  } else if (Array.isArray(block)) {
    topicsData.topics.push(...block)
  } else {
    topicsData.topics.push(block)
  }
}
```

## 影響範囲
- Perplexity APIからのレスポンス処理
- トピック収集フェーズの安定性向上
- 様々なフォーマットのPerplexityレスポンスに対応可能

## テスト推奨事項
1. 複数JSONブロックを含むPerplexityレスポンスでのテスト
2. Markdown形式とプレーンJSON形式の両方でのテスト
3. 部分的に壊れたJSONを含むレスポンスでのエラーハンドリング確認