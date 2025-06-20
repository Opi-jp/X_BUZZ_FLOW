# Create実装計画 0621版

## 背景・経緯

### 問題の発見
- **フロントエンドエラー**: 最初のページから500エラー、ビルドも失敗
- **API-DB不整合**: `prisma.perplexityReport` vs `perplexity_reports`
- **フロント-API不整合**: 古いAPIパス前提のフロントエンド
- **三重不整合**: API↔DB、フロント↔API、フロント↔DBすべてが不整合

### 統合計画Option A採用の経緯
- 段階的移行では永続ループのリスク
- APIエンドポイント200個超の異常事態
- 統合計画完全準拠で根本解決を決定
- 「3日かけて完成させた動作」を統合計画準拠構造で再実装

### 重要な教訓
1. **エンドポイント配置≠動作確認**: APIの場所を移動しただけでは意味がない
2. **ビルドエラー状態でのテスト無意味性**: TypeScript/Next.jsエラーを先に解決
3. **DB整合性の最重要性**: スキーマが基準、すべてがこれに合わせる
4. **責任分界の重要性**: Create（下書きまで）vs Publish（投稿実行）

## 実装計画詳細

### Phase 1: 現状調査・基盤確認 (1日目)

#### 1.1 DBスキーマ実態調査
```bash
# DB整合性チェックツール実行
node scripts/dev-tools/db-schema-validator.js

# 実際のテーブル構造確認
npx prisma db pull
npx prisma generate
```

**確認項目**:
- `viral_sessions` テーブル: theme, platform, style, status, topics, concepts, contents
- `viral_drafts_v2` テーブル: session_id, concept_id, title, content, hashtags
- フィールド命名: snake_case vs camelCase
- JSON型フィールドの構造（topics, concepts, contents）

#### 1.2 既存API実装確認
```bash
# API依存関係スキャン
node scripts/dev-tools/api-dependency-scanner.js

# 動作するAPIの特定
grep -r "viral_sessions" app/api --include="*.ts"
```

**確認項目**:
- `/api/create/flow/start` - セッション作成
- `/api/create/flow/[id]/collect` - Intel連携
- `/api/create/flow/[id]/concepts` - GPT生成
- `/api/create/flow/[id]/generate` - Claude生成
- 依存モジュールの実装状況

#### 1.3 Twitter認証システム確認
```bash
# 環境変数確認
node scripts/dev-tools/check-env.js

# NextAuth設定確認
grep -r "TWITTER" app/api/auth --include="*.ts"
```

**確認項目**:
- `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`
- OAuth 1.1/2.0両対応
- NextAuth設定: `app/api/auth/[...nextauth]/route.ts`
- 投稿API: `/api/publish/post/now`

#### 1.4 予想エラー・対策
| エラー種別 | 具体例 | 対策 |
|---|---|---|
| 型エラー | `Property 'perplexityReport' does not exist` | テーブル名修正 |
| モジュール不足 | `Can't resolve '@/lib/parsers/perplexity-parser'` | クラス実装 |
| DB接続エラー | `Column 'created_at' does not exist` | フィールド名統一 |
| 認証エラー | `Twitter API key invalid` | 環境変数確認 |

### Phase 2: API整合性修正 (2日目)

#### 2.1 必須モジュール実装
```typescript
// /lib/parsers/perplexity-parser.ts
export class PerplexityResponseParser {
  parseTopics(rawContent: string): ParsedTopics {
    // Markdownからのデータ抽出
    // JSON blockの解析
    // エラーハンドリング
  }
}
```

**実装項目**:
- PerplexityResponseParser完全実装
- 統一システム管理の型定義修正
- エラーハンドリング強化

#### 2.2 DB接続修正
```typescript
// Prismaフィールド名統一例
// 修正前: prisma.perplexityReport
// 修正後: prisma.perplexity_reports

// snake_case → camelCase変換対応
const session = await prisma.viral_sessions.create({
  data: {
    theme, // OK
    created_at: new Date(), // snake_case
    // createdAt: new Date(), // NG
  }
})
```

**修正項目**:
- 全APIでのテーブル名・フィールド名統一
- Prisma型定義とDB実態の整合
- JSON型フィールドの構造統一

#### 2.3 Twitter認証・投稿API確認
```typescript
// 投稿API動作確認
const tweetResult = await fetch('/api/publish/post/now', {
  method: 'POST',
  body: JSON.stringify({ content: "テスト投稿" })
})
```

**確認項目**:
- OAuth認証フロー完全動作
- 投稿権限・スコープ確認
- Rate limit対応

#### 2.4 予想エラー・対策
| エラー種別 | 具体例 | 対策 |
|---|---|---|
| Prisma型エラー | Type 'string' is not assignable to type 'Date' | 型定義修正 |
| マイグレーション | Schema drift detected | `prisma db push` |
| Twitter API | Rate limit exceeded | リトライ・待機機能 |
| 投稿失敗 | Character limit exceeded | 文字数チェック |

### Phase 3: フロントエンド完全作り直し (3-4日目)

#### 3.1 認証UI実装
```typescript
// /app/auth/twitter/page.tsx
export default function TwitterAuthPage() {
  const { data: session } = useSession()
  
  return (
    <div>
      {!session ? (
        <button onClick={() => signIn('twitter')}>
          Twitter認証
        </button>
      ) : (
        <div>認証済み: @{session.user.username}</div>
      )}
    </div>
  )
}
```

**実装項目**:
- Twitter認証ボタン・フロー
- ログイン状態管理（useSession）
- 認証エラーハンドリング

#### 3.2 型定義統一
```typescript
// /types/create-flow.ts
// DBスキーマベース
interface ViralSession {
  id: string
  theme: string
  platform: string
  style: string
  status: SessionStatus
  topics: PerplexityTopics | null
  concepts: GPTConcepts | null
  contents: ClaudeContents | null
  created_at: Date
}

// フロントエンド表示用
interface SessionDisplayData {
  id: string
  theme: string
  currentStep: string
  progress: ProgressStatus
  canEdit: boolean
}
```

**定義項目**:
- DB型とフロント型の明確分離
- API契約型の定義
- エラー型の統一

#### 3.3 新規UI実装

**ページ構成**:
```
/create/                    # 概要ページ（認証状態表示）
├── new/                    # セッション作成（認証必須）
└── flow/[id]/             # フロー進行・編集・投稿
    ├── collect.tsx        # Intel収集フェーズ
    ├── concepts.tsx       # GPT生成フェーズ  
    ├── generate.tsx       # Claude生成フェーズ
    └── publish.tsx        # 投稿実行フェーズ
```

**実装項目**:
- 認証状態での条件分岐
- リアルタイム進捗表示
- エラーハンドリングUI
- 投稿プレビュー・編集機能

#### 3.4 予想エラー・対策
| エラー種別 | 具体例 | 対策 |
|---|---|---|
| 認証状態エラー | Session expired | 自動再認証 |
| 型エラー | API response type mismatch | 型ガード実装 |
| 状態管理エラー | Race condition in async calls | useEffect依存配列 |
| UI表示エラー | Undefined data rendering | 条件分岐・fallback |

### Phase 4: 統合テスト・実投稿確認 (5日目)

#### 4.1 認証フロー確認
```bash
# 認証テスト手順
1. /auth/twitter でTwitter認証
2. OAuth callback確認  
3. セッション保存確認
4. 投稿権限確認
```

#### 4.2 E2Eフロー確認
```bash
# 完全フローテスト
1. Twitter認証 ✓
2. /create/new でセッション作成 ✓
3. Intel収集（20-60秒） ✓
4. GPT概念生成（15-45秒） ✓
5. Claude投稿生成（10-30秒） ✓
6. 下書き編集 ✓
7. 実Twitter投稿 ✓
8. 投稿URL確認 ✓
```

#### 4.3 予想エラー・対策
| エラー種別 | 原因 | 対策 |
|---|---|---|
| Twitter認証失敗 | API Key無効 | 環境変数再確認 |
| 投稿失敗 | 重複投稿検出 | タイムスタンプ追加 |
| LLMタイムアウト | API応答遅延 | タイムアウト延長 |
| データ不整合 | 途中ステップ失敗 | トランザクション実装 |

## 高リスク要素と対策

### 1. Twitter認証（最高リスク）
- **リスク**: OAuth設定ミス、API制限
- **対策**: 段階的テスト、モック投稿機能

### 2. DB整合性（高リスク）
- **リスク**: 全システムに影響
- **対策**: スキーマ検証ツール、マイグレーション計画

### 3. 実投稿（最終目標）
- **リスク**: 外部依存、予期しない制限
- **対策**: エラーハンドリング強化、フォールバック

### 4. 型定義（開発効率）
- **リスク**: TypeScript strict mode大量エラー
- **対策**: 段階的修正、型ガード実装

### 5. LLM統合（安定性）
- **リスク**: 外部API不安定性
- **対策**: リトライ機能、タイムアウト対応

## 成功基準（優先順位）

### 必須（Phase完了条件）
1. **ビルドエラー0**: TypeScript/Next.jsエラー完全解決
2. **Twitter認証成功**: OAuth完全フロー動作
3. **DB接続正常**: CRUD操作すべて成功

### 目標（実装完了条件）  
4. **セッション作成成功**: `/create/new`で正常作成
5. **3段階フロー完走**: Intel→Create→Generateすべて成功
6. **下書き編集機能**: ユーザーが内容修正可能

### 最終目標（真の成功）
7. **実際のTwitter投稿成功**: 実際のツイート投稿
8. **投稿URL取得**: ツイートURLの確認・保存

## 今後の展開（0621版完了後）

1. **Publish モジュール**: 下書きからの投稿管理
2. **Intel モジュール**: News/Social統合  
3. **Analyze モジュール**: 投稿結果分析
4. **システム統合**: 4モジュール連携

---

*作成日: 2025年6月21日*  
*状況: Phase 1実行待ち*