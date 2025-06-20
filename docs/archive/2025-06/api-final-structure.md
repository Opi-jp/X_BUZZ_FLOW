# 最終的なAPI構造（バージョン番号なし）

## 設計原則
- **バージョン番号は使わない**（v2、v3などは複雑性の元凶）
- **機能ベースのシンプルな命名**
- **RESTfulな設計**

## 最終構造（11個のエンドポイントのみ）

### 1. フロー管理（3個）
```
POST   /api/flow                 # フロー開始
GET    /api/flow/[id]           # ステータス確認
POST   /api/flow/[id]/next      # 次のステップへ
```

### 2. 下書き管理（3個）
```
GET    /api/drafts              # 下書き一覧
GET    /api/drafts/[id]         # 下書き詳細
PUT    /api/drafts/[id]         # 下書き編集
```

### 3. 投稿（2個）
```
POST   /api/post                # 即時投稿
POST   /api/schedule            # スケジュール投稿
```

### 4. データ取得（3個）
```
GET    /api/news                # ニュース取得
GET    /api/trends              # トレンド取得
GET    /api/analytics           # 分析データ
```

## 実装方針

### 1. 既存APIの整理
- 117個のAPIを上記11個に統合
- 機能的に重複するものは1つに統一
- test-*、debug-*、*-v2などは全削除

### 2. 内部処理の整理
```typescript
// フロー管理の内部処理
class FlowManager {
  async start(theme: string) {
    // 1. セッション作成
    // 2. Perplexity収集を自動開始
    // 3. 進捗をDBに保存
  }
  
  async processNext(id: string, data?: any) {
    // 現在の状態を確認
    // 次のステップを判定
    // 適切なAI処理を実行
  }
}
```

### 3. フロントエンドの簡素化
```typescript
// シンプルなAPI呼び出し
const response = await fetch('/api/flow', {
  method: 'POST',
  body: JSON.stringify({ theme })
})

// ステータス確認
const status = await fetch(`/api/flow/${id}`)

// 次へ進む
const next = await fetch(`/api/flow/${id}/next`, {
  method: 'POST',
  body: JSON.stringify({ selectedConcepts })
})
```

## なぜバージョン番号を使わないか

1. **永続的な混乱の元**
   - v1があるとv2を作りたくなる
   - v2があるとv3を作りたくなる
   - 結果: `/api/v1/*`、`/api/v2/*`、`/api/v3/*`の混在

2. **本来不要**
   - 適切な設計なら最初から正しく作れる
   - 変更が必要なら、新しい機能として追加
   - 古い機能は段階的に削除

3. **シンプルさの維持**
   - URLを見れば何をするAPIか明確
   - バージョンによる混乱がない
   - メンテナンスが容易

## 移行計画

### Phase 1: 新構造の実装（今すぐ）
- `/api/flow/*` の実装
- 既存の機能を内部で呼び出し

### Phase 2: フロントエンド更新（1日）
- 新しいAPIを使用するように更新
- 旧APIへの依存を削除

### Phase 3: 旧API削除（1週間後）
- 使用されていないAPIを削除
- コードベースのクリーンアップ

## 結論
バージョン番号（v2など）は使わず、最初から正しいシンプルな構造で実装する。