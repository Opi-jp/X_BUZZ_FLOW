# APIエンドポイント移行計画

## 概要

X_BUZZ_FLOWプロジェクトのAPIエンドポイントを整理し、先祖返りを防ぐための移行計画です。

## 現状の問題点

### 1. エンドポイントの重複
- 旧パス（`/api/viral/*`, `/api/news/*` など）と新パス（`/api/intelligence/*`, `/api/generation/*` など）が混在
- 同じ機能に対して複数のエンドポイントが存在
- 22個のtest-*エンドポイントが本番コードと混在

### 2. データモデルの不整合
- **ViralSession** (旧): `/api/viral/v2/sessions` で使用
- **CotSession** (新): `/api/generation/content/session` で使用
- 同じ機能だが異なるデータ構造

### 3. フロントエンドの混乱
- 旧エンドポイントを直接呼んでいるコンポーネントが多数存在
- API呼び出しが統一されていない

## 移行計画

### Phase 1: API定数とクライアントの導入（完了）
- [x] `lib/api-endpoints.ts` - API定数ファイルの作成
- [x] `lib/api-client.ts` - 統一APIクライアントの作成
- [x] middleware.tsに開発環境での警告機能を追加

### Phase 2: テストエンドポイントの整理（実行準備完了）
```bash
# ドライラン
./scripts/cleanup-duplicate-endpoints.sh

# 実行
./scripts/cleanup-duplicate-endpoints.sh --execute
```

削除対象:
- 22個のtest-*エンドポイント
- 不要なredirect.tsファイル

### Phase 3: フロントエンドコードの更新

#### 3.1 旧API呼び出しの更新例

**Before:**
```typescript
// 旧コード
const response = await fetch('/api/viral/cot-session/create', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

**After:**
```typescript
// 新コード（方法1: api-clientを使用）
import { api } from '@/lib/api-client'
const response = await api.generation.content.session.create(data)

// 新コード（方法2: api-endpointsを使用）
import { API_ENDPOINTS } from '@/lib/api-endpoints'
const response = await fetch(API_ENDPOINTS.generation.content.session.create, {
  method: 'POST',
  body: JSON.stringify(data)
})
```

#### 3.2 更新が必要な主要コンポーネント
1. `/app/viral/v2/page.tsx` - ViralSessionを使用
2. `/app/viral/cot/CoTCreationForm.tsx` - CotSessionを使用
3. `/app/buzz/page.tsx` - 旧buzzエンドポイントを使用
4. `/app/news/page.tsx` - 旧newsエンドポイントを使用

### Phase 4: データモデルの統合

#### 4.1 ViralSession → CotSession移行

**現状:**
- ViralSession: theme, platform, style, status, currentPhase
- CotSession: theme, style, platform, status, currentPhase, phases (JSON)

**移行戦略:**
1. CotSessionにViralSession固有のフィールドを追加
2. データ移行スクリプトの作成
3. ViralSession参照を段階的にCotSessionに変更

#### 4.2 移行スクリプト案
```sql
-- ViralSessionデータをCotSessionに移行
INSERT INTO cot_sessions (id, theme, style, platform, status, currentPhase, createdAt, updatedAt)
SELECT id, theme, style, platform, 
       CASE status 
         WHEN 'PENDING' THEN 'PENDING'::cot_session_status
         WHEN 'COMPLETED' THEN 'COMPLETED'::cot_session_status
         ELSE 'PENDING'::cot_session_status
       END,
       0 as currentPhase,
       createdAt, 
       updatedAt
FROM viral_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM cot_sessions WHERE cot_sessions.id = viral_sessions.id
);
```

### Phase 5: 旧エンドポイントの物理削除

**削除対象ディレクトリ:**
1. `/app/api/viral/` （リダイレクト設定済みのもの）
2. `/app/api/news/` （intelligenceに移行済み）
3. `/app/api/buzz/` （intelligenceに移行済み）

**注意:** 削除前に必ず以下を確認
- middleware.tsでリダイレクトが設定されている
- 新エンドポイントが完全に動作している
- フロントエンドが新エンドポイントを使用している

## リスク管理

### 1. 段階的移行
- 一度に全てを変更せず、機能ごとに段階的に移行
- 各段階でテストを実施

### 2. ロールバック計画
- Git履歴を活用した迅速なロールバック
- 重要な変更前にタグを作成

### 3. モニタリング
- middleware.tsの警告ログで旧エンドポイントの使用を監視
- エラーログの監視強化

## 成功指標

1. **技術的指標**
   - test-*エンドポイントの完全削除
   - 旧エンドポイントへのアクセスがゼロ
   - ViralSessionとCotSessionの統合完了

2. **運用指標**
   - APIレスポンスタイムの改善（リダイレクトなし）
   - エラー率の低下
   - 開発効率の向上

## タイムライン

- **Week 1**: Phase 1-2 完了（APIクライアント導入、テストエンドポイント削除）
- **Week 2**: Phase 3 開始（フロントエンド更新）
- **Week 3**: Phase 4 実施（データモデル統合）
- **Week 4**: Phase 5 完了（旧エンドポイント削除）

## 次のアクション

1. `cleanup-duplicate-endpoints.sh`を実行してテストエンドポイントを削除
2. 主要なフロントエンドコンポーネントからapi-clientの使用を開始
3. ViralSession使用箇所の調査と移行計画の詳細化