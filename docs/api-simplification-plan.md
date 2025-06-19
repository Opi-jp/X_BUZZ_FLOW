# API簡素化計画

## 現状の問題
- **117個のAPIエンドポイント**（本来15個で十分）
- テストのたびに仮エンドポイントを作成し、削除されずに蓄積
- 同じ機能に7個もの重複エンドポイント

## シンプルな直線的フロー
```
テーマ入力 → Perplexity収集 → GPT生成 → Claude生成 → 投稿
```

## 必要なAPIエンドポイント（15個のみ）

### 1. コア機能（7個）
```
POST   /api/flow/start          - フロー開始（テーマ入力）
GET    /api/flow/[id]/status    - 進捗確認
POST   /api/flow/[id]/next      - 次のステップへ
DELETE /api/flow/[id]           - キャンセル

GET    /api/drafts              - 下書き一覧
PUT    /api/drafts/[id]         - 下書き編集
POST   /api/post                - 投稿実行
```

### 2. オプション機能（8個）
```
GET    /api/news                - ニュース取得
GET    /api/trends              - トレンド取得
POST   /api/schedule            - スケジュール設定
GET    /api/analytics           - 分析データ

GET    /api/characters          - キャラクター一覧
GET    /api/templates           - テンプレート一覧
GET    /api/history             - 履歴
GET    /api/settings            - 設定
```

## 実装方針

### 1. 統一されたフロー管理
```typescript
// 単一のフローマネージャー
POST /api/flow/start
{
  theme: "AIと創造性",
  options: {
    platform: "Twitter",
    style: "エンターテイメント"
  }
}

// ステップを進める（内部で適切なAIを呼び出し）
POST /api/flow/[id]/next
```

### 2. 削除すべきAPI例
- `/generation/content/sessions/[id]/generate-character-contents-v2` 
- `/generation/content/session/[sessionId]/drafts` (単数形)
- `/test-*` で始まるすべてのAPI
- `/debug-*` で始まるすべてのAPI

### 3. 移行戦略
1. 新しいシンプルAPIを `/api/v2/` に実装
2. フロントエンドを新APIに切り替え
3. 旧APIを段階的に削除
4. 最終的に `/api/v2/` を `/api/` に移動

## 期待される効果
- コードベースの60%削減
- デバッグ時間の大幅短縮
- 新機能追加の容易化
- エラーの減少