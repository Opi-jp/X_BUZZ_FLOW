# API契約書（API Contracts）

## 📜 このドキュメントの目的

フロントエンド・バックエンド・DBの実装の整合性を保ち、「古いフロントに合わせてAPIを退化させる」問題を防ぐ。

## 🚨 重要な原則

1. **APIファースト開発**
   - まずAPIの仕様を決める
   - フロントはAPIの仕様に従う
   - 「フロントが動かないからAPIを変える」は禁止

2. **バージョニング**
   - 新しいAPIは新しいパスで作る（例: v2, v3）
   - 古いAPIは非推奨（deprecated）としてマーク
   - 移行期間を設ける

3. **契約の記録**
   - API変更時は必ずこのドキュメントを更新
   - フロント側の対応状況を記録

---

## 📋 現在のAPI契約

### 1. セッション管理 API

#### 現行バージョン（v2）
```typescript
// POST /api/viral/v2/sessions
// リクエスト
{
  theme: string          // 旧: expertise から変更
  platform: string
  style: string
}

// レスポンス
{
  id: string
  theme: string          // 旧: expertise
  status: string
  createdAt: string
}
```

**フロント対応状況**: 
- ✅ `/app/viral/v2/page.tsx` - 対応済み
- ❌ `/app/viral/cot/page.tsx` - 未対応（expertiseのまま）

#### 移行予定（generation API）
```typescript
// POST /api/generation/content/session/create
// 新しい統一API（未実装）
```

---

### 2. 下書き管理 API

#### 現行バージョン
```typescript
// GET /api/viral/v2/drafts/[id]
// PATCH /api/viral/v2/drafts/[id]
{
  content: string
  hashtags: string[]
  characterId?: string
}
```

**フロント対応状況**: 
- ✅ 完全対応

---

### 3. コンセプト生成 API

#### 現行バージョン
```typescript
// POST /api/viral/v2/sessions/[id]/generate-concepts
// レスポンス
{
  concepts: Array<{
    id: string
    hook: string
    angle: string
    keyPoints: string[]
    hookType: string      // 新規追加
    angleCombination: string[]  // 新規追加
  }>
}
```

**フロント対応状況**: 
- ⚠️ 部分対応（新フィールド未表示）
- hookType, angleCombinationは表示されていない

---

## 🔄 移行計画

### Phase 1: 現状維持（2025年6月）
- v2 APIを安定運用
- フロントの未対応部分を文書化

### Phase 2: フロント更新（未定）
- 新フィールドの表示対応
- expertise → theme の完全移行

### Phase 3: 新API移行（未定）
- generation/content/* への段階的移行
- 旧APIのdeprecated化

---

## ⚠️ 開発時の注意事項

### やってはいけないこと
1. **フロントが古いという理由でAPIを古い仕様に戻す**
2. **ドキュメントなしでAPIを変更する**
3. **複数バージョンを同時に変更する**

### やるべきこと
1. **新機能は新しいAPIバージョンで実装**
2. **変更時は必ずこのドキュメントを更新**
3. **フロント側の対応計画を明記**

---

## 📝 変更履歴

### 2025-06-18
- expertise → theme 変更を記録
- hookType, angleCombination追加を記録
- フロント対応状況を文書化

---

## 🔍 現状確認コマンド

```bash
# API使用状況を確認
node scripts/dev-tools/api-dependency-scanner.js

# フロントとAPIの乖離をチェック
# TODO: フロント-API整合性チェックツールの作成
```