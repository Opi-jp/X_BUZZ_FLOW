# Step 1 二段階実装ドキュメント

## 概要
Responses APIのレスポンス長制限によるJSON切れ問題を解決するため、Step 1を2つのフェーズに分割しました。

## 問題の背景
- Responses APIは`max_tokens`パラメータをサポートしない
- 10-15件の詳細な記事分析は大量の出力となる
- JSONレスポンスが途中で切れてデータが不完全になる
- 部分的なデータでChain of Thoughtを続行すると品質が低下

## 解決策：2段階アプローチ

### Phase 1-A: 記事収集（step1-collect）
**エンドポイント**: `/api/viral/gpt-session/[sessionId]/step1-collect`

**機能**:
- Responses API + Web検索で記事URLを収集
- 簡潔な出力形式（URLとタイトルのみ）
- 10-15件の記事を確実に収集

**出力例**:
```json
{
  "articles": [
    {
      "title": "AIの世界市場は2028年に1700億ドル規模に",
      "url": "https://www.nikkeibp.co.jp/...",
      "publishDate": "2024-09-13",
      "source": "日経BP",
      "category": "テクノロジー"
    }
  ]
}
```

### Phase 1-B: 詳細分析（step1-analyze）
**エンドポイント**: `/api/viral/gpt-session/[sessionId]/step1-analyze`

**機能**:
- Chat Completions API使用（max_tokens: 4000）
- 収集した記事の詳細分析
- 完全なChain of Thought Step 1出力を生成

**特徴**:
- 8カテゴリの包括的分析
- 専門分野視点での解釈
- バイラルパターンの評価
- 完全なJSON出力を保証

## 使用方法

### 1. 個別実行
```javascript
// Phase 1-A: 記事収集
const collectResponse = await fetch(`/api/viral/gpt-session/${sessionId}/step1-collect`, {
  method: 'POST'
})
const { articles } = await collectResponse.json()

// Phase 1-B: 詳細分析
const analyzeResponse = await fetch(`/api/viral/gpt-session/${sessionId}/step1-analyze`, {
  method: 'POST',
  body: JSON.stringify({ articles })
})
```

### 2. 統合実行（推奨）
既存の`step1-responses`を修正して内部で2段階処理を行うことも可能。

## メリット
1. **Web検索機能の維持** - Responses APIの利点を活用
2. **完全なデータ取得** - JSON切れの問題を解決
3. **品質保証** - Chain of Thoughtの各段階で完全なデータを使用
4. **柔軟性** - 必要に応じて各フェーズを個別に実行可能

## 技術的詳細

### エラーハンドリング
- Phase 1-Aで記事が取得できない場合は適切なエラーを返す
- Phase 1-Bでは記事データの検証を実施
- JSON修復機能も引き続き利用可能

### パフォーマンス
- Phase 1-A: 約10-15秒（Web検索）
- Phase 1-B: 約15-20秒（詳細分析）
- 合計: 約25-35秒（従来の50-60秒より高速）

## 今後の拡張
- 記事収集の並列化
- キャッシュ機能の追加
- より効率的な出力形式の検討