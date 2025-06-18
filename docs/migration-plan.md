# 命名規則マイグレーション計画

## 優先度順の変更リスト

### 1. CoTシステム関連（最優先）
- `/api/viral/cot-session/*` → `/api/generation/content/session/*`
- `/api/viral/v2/sessions/*` → `/api/generation/content/sessions/*`
- `/app/viral/cot/*` → `/app/generation/content/*`

### 2. 主要システム
- `/api/news/*` → `/api/intelligence/news/*`
- `/api/buzz/*` → `/api/intelligence/buzz/*`
- `/api/viral/drafts/*` → `/api/generation/drafts/*`
- `/api/characters/*` → `/api/generation/characters/*`

### 3. 自動化システム
- `/api/viral/scheduler/*` → `/api/automation/scheduler/*`
- `/api/viral/performance/*` → `/api/automation/performance/*`

### 4. フロントエンドルート
- `/app/viral/*` → `/app/generation/*`
- `/app/news/*` → `/app/intelligence/news/*`
- `/app/buzz/*` → `/app/intelligence/buzz/*`

## リダイレクト戦略
1. middleware.tsで自動リダイレクト
2. 既存コードの段階的更新
3. テスト後に旧ルート削除