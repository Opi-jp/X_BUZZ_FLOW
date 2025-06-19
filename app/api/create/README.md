# Creation (Create) Module

## 概要
AIを活用したコンテンツ生成を担当するモジュール。3段階のAI生成フロー（Perplexity→GPT→Claude）を管理します。

## サブモジュール

### Flow
- **start**: 生成フロー開始
- **process**: 処理実行
- **complete**: 完了処理

### Draft
- **generate**: 下書き生成
- **edit**: 編集
- **approve**: 承認

### Persona
- **list**: キャラクター一覧
- **apply**: キャラクター適用

## エンドポイント例
- `POST /api/create/flow/start`
- `GET /api/create/flow/{id}/status`
- `POST /api/create/draft/generate`
- `PUT /api/create/draft/{id}/edit`