# CoTシステム 現在の状況整理

## 🎯 本当に必要な最小限のフロー

### 1. セッション作成
```
POST /api/generation/content/session/create
Body: {
  theme: "AIと働き方",
  platform: "Twitter", 
  style: "エンターテイメント"
}
```

### 2. トピック収集（Perplexity）
```
POST /api/generation/content/sessions/{id}/collect
```

### 3. コンセプト生成（GPT）
```
POST /api/generation/content/sessions/{id}/generate-concepts
```

### 4. コンテンツ生成（Claude）
```
POST /api/generation/content/sessions/{id}/integrate
Body: {
  selectedConcepts: [0, 1, 2],
  characterId: "cardi-dare"
}
```

### 5. 下書き確認
```
GET /api/generation/drafts
```

## ❌ 使わないエンドポイント

- `/api/viral/*` - 旧システム
- `/api/generation/content/session/[sessionId]/*` - sessionId版
- `/api/debug/*` - デバッグ用
- その他多数の重複エンドポイント

## 🔧 修正が必要な主要エラー

1. **prismaインポートエラー** (9件)
   - `@/lib/generated/prisma` → `@/lib/prisma`

2. **expertiseフィールドエラー** (複数)
   - `expertise` → `theme`

3. **型定義エラー**
   - Route関数の第2引数の型

## 📋 次のステップ

1. 上記の最小限のフローが動作することを確認
2. エラーを一つずつ修正（新しいものは作らない）
3. 不要なエンドポイントは触らない（後で削除）