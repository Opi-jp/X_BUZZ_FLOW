# Chain of Thought実装原則

## 基本理念
Chain of Thoughtは「GPTに考えさせる」技法であり、ハードコードされた処理ではない。

## 各フェーズの実装原則

### Phase 1: トレンド収集
- ❌ 「過去7日以内」などの固定時間範囲
- ❌ 決められた検索クエリテンプレート
- ✅ GPTが戦略的に時間範囲を判断（レトロブーム、周年記念なども考慮）
- ✅ GPTが完全な自然言語質問を生成

### Phase 2: 機会評価
- ❌ 固定の評価基準（viral velocity metricsなど）
- ❌ ハードコードされたスコアリングロジック
- ✅ GPTが状況に応じて評価基準を決定
- ✅ A（ウイルス速度指標）とB（コンテンツアングル）を同時に評価

### Phase 3: コンセプト生成
- ❌ 決められたフォーマット（スレッド/ビデオ/投稿）の強制
- ❌ テンプレート的な構成
- ✅ GPTがプラットフォームとトレンドに最適なフォーマットを選択
- ✅ 創造的な自由度を最大化

### Phase 4: コンテンツ作成
- ❌ 固定の文字数制限
- ❌ 決められた構成パターン
- ✅ GPTがプラットフォームに最適な長さ・構成を判断
- ✅ コピペ即投稿可能な完全なコンテンツ

### Phase 5: 実行戦略
- ❌ 固定のKPIセット
- ❌ 決められた投稿時間
- ✅ GPTが状況に応じたKPIを設定
- ✅ トレンドの性質に基づく最適タイミング

## システム設計の利点

### 1. モデルの進化への適応
- GPT-4からGPT-5へのアップグレードが容易
- モデルが賢くなれば自動的に品質向上

### 2. 創造性の最大化
- ハードコードによる制限がない
- 人間の戦略家と同じ柔軟性

### 3. 長期的な持続可能性
- トレンドの変化に自動適応
- プラットフォームの文化変化に対応

## 実装時の注意事項

### やってはいけないこと
1. プロンプトの簡略化・削除
2. 評価基準のハードコード
3. 時間範囲の固定
4. フォーマットの強制
5. フェーズ間でのプロンプト移動

### 守るべきこと
1. オリジナルプロンプトの構造を維持
2. GPTの判断を信頼
3. 各フェーズの独立性を保つ
4. 結果のJSON形式は維持（システム連携のため）

## まとめ
Chain of Thoughtの本質は、GPTに「バズるコンテンツ戦略家」として思考させることです。
ハードコードは最小限に抑え、GPTの創造性と戦略的思考を最大限に活用しましょう。