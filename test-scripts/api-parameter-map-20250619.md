# API パラメータ完全マップ

## 1. POST /api/flow (セッション作成)
### 期待パラメータ:
- `theme` (必須)
- `platform` (必須) 
- `style` (必須)

### レスポンス:
- `id` - セッションID
- `status` - セッションステータス
- `message` - メッセージ

---

## 2. POST /api/flow/[id]/next (フロー進行)
### 期待パラメータ:
- `autoProgress` (オプション、デフォルト: false)
- `selectedConcepts` (手動モード時、コンセプト選択時に必須)
  - 配列形式: `[{conceptId: "xxx"}, ...]`
- `characterId` (手動モード時、キャラクター選択時に使用可能)

### 状態別の動作:
- **CONCEPTS_GENERATED状態 + 手動モード**: `selectedConcepts`が必須
- **CONTENTS_GENERATED前 + 手動モード**: `characterId`が必須
- **autoProgress=true**: すべて自動選択

---

## 3. POST /api/generation/content/sessions/[id]/collect
### 期待パラメータ:
- なし（URLのセッションIDのみ使用）

### 注意:
- フロー進行時に`theme`, `platform`, `style`が送られているが無害

---

## 4. POST /api/generation/content/sessions/[id]/generate-concepts
### 期待パラメータ:
- なし（URLのセッションIDのみ使用）

---

## 5. POST /api/generation/content/sessions/[id]/generate
### 期待パラメータ:
- `characterId` (必須)

---

## 6. POST /api/post (Twitter投稿)
### 期待パラメータ:
- `text` (必須) ⚠️ **contentではない**
- `draftId` (オプション)

### 問題:
- テストスクリプトが`content`を送っている → `text`に修正必要
- `hashtags`は不要（textに含まれている）

---

## 7. GET /api/flow/[id] (ステータス確認)
### 期待パラメータ:
- なし（URLのセッションIDのみ使用）

### レスポンス形式の問題:
- `status`フィールドが含まれていない可能性
- `session.status`として返される場合がある

---

## 8. GET /api/drafts (下書き一覧)
### 期待パラメータ:
- なし

### レスポンス形式の問題:
- 配列として返される場合
- `{drafts: [...]}`オブジェクトとして返される場合