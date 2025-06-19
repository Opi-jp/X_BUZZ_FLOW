# Create→Post フロー統合・整理計画

*作成日: 2025年6月19日*
*対象: Perplexity→GPT→Claude→Draft→Post の完全フロー*

## 📋 エグゼクティブサマリー

### 現状
- Create→Draft→Post フローの基本実装は完了
- ViralDraftV2への移行完了、DB接続問題解決済み
- しかし、命名規則の不統一・エラーハンドリングの不備・統合システム計画との乖離が存在

### 目標
1. **統合システム計画に準拠した命名規則への移行**
2. **包括的なエラーチェック・デバッグ体制の確立**
3. **プロダクション準備完了状態への到達**

## 🔍 Phase 1: 現状分析・エラー調査（1-2日）

### 1.1 現在のAPI構造分析
```bash
# 現在の使用中API（要確認）
/api/flow/*                    # セッション管理
/api/generation/content/*      # コンテンツ生成
/api/drafts/*                  # 下書き管理
/api/post                      # 投稿実行

# 統合計画での理想形
/api/intel/*                   # Intelligence
/api/create/*                  # Creation
/api/publish/*                 # Publishing
```

### 1.2 データフロー完全性チェック
**実行項目:**
```bash
# 1. 全APIエンドポイントの依存関係スキャン
node scripts/dev-tools/api-dependency-scanner.js --detailed

# 2. DBスキーマとAPI実装の整合性検証
node scripts/dev-tools/db-schema-validator.js --all-tables

# 3. フロントエンド→バックエンド呼び出しパターン分析
node scripts/dev-tools/flow-visualizer.js --all-sessions
```

### 1.3 エラーパターン分析
**過去エラーの体系的調査:**
```bash
# カテゴリ別エラー分析
node scripts/dev-tools/find-error.js --categories
node scripts/dev-tools/find-error.js "create" --detail
node scripts/dev-tools/find-error.js "draft" --detail
node scripts/dev-tools/find-error.js "post" --detail
```

**特定すべき問題領域:**
- [ ] Perplexity→GPT データ変換エラー
- [ ] GPT→Claude データ変換エラー
- [ ] Claude→ViralDraftV2 作成エラー
- [ ] ViralDraftV2→投稿 実行エラー
- [ ] プロンプトローダー関連エラー
- [ ] DB接続・トランザクションエラー

## 🏗️ Phase 2: 命名規則統一（2-3日）

### 2.1 API構造移行計画

#### Current → Target マッピング
```javascript
// Phase 2.1: 段階的リダイレクト設定
const apiMigrationMap = {
  // Creation フロー
  '/api/flow/start': '/api/create/flow/start',
  '/api/flow/[id]': '/api/create/flow/[id]/status', 
  '/api/flow/[id]/next': '/api/create/flow/[id]/proceed',
  
  // Content Generation
  '/api/generation/content/sessions/[id]/collect': '/api/intel/collect/topics',
  '/api/generation/content/sessions/[id]/generate-concepts': '/api/create/concept/generate',
  '/api/generation/content/sessions/[id]/generate': '/api/create/content/generate',
  
  // Draft Management  
  '/api/drafts': '/api/create/draft/list',
  '/api/drafts/[id]': '/api/create/draft/[id]',
  
  // Publishing
  '/api/post': '/api/publish/post/now'
}
```

#### 実装手順
1. **新API作成**: 統合計画準拠の新エンドポイント
2. **リダイレクト設定**: middleware.tsでの段階的移行
3. **フロントエンド更新**: 新APIへの呼び出し変更
4. **旧API削除**: 完全移行後のクリーンアップ

### 2.2 データベース命名統一

#### 現在のスキーマ vs 理想形
```sql
-- 現在
ViralSession     → CreateSession
ViralDraftV2     → ContentDraft
ViralDraft       → 削除（旧版）

-- フィールド命名
selectedIds      → selectedConceptIds
contents         → generatedContent
claudeData       → 削除（contentsに統合）
```

### 2.3 フロントエンド構造整理

#### ページ構造の統一
```
app/
├── intel/          # Intelligence（今後の拡張）
├── create/         # Creation
│   ├── flow/[id]   # 生成フロー
│   └── draft/      # 下書き管理
└── publish/        # Publishing（今後の拡張）
```

## 🛠️ Phase 3: エラーハンドリング強化（2-3日）

### 3.1 包括的エラーハンドリング実装

#### API レベル
```typescript
// 標準エラーレスポンス形式
interface APIError {
  error: string
  code: string
  details?: any
  timestamp: string
  requestId: string
  phase?: 'perplexity' | 'gpt' | 'claude' | 'draft' | 'post'
}
```

#### フロントエンド レベル
```typescript
// エラー境界とユーザー向けメッセージ
const ErrorBoundary = {
  perplexityError: "情報収集でエラーが発生しました",
  gptError: "コンセプト生成でエラーが発生しました", 
  claudeError: "投稿生成でエラーが発生しました",
  draftError: "下書き操作でエラーが発生しました",
  postError: "投稿でエラーが発生しました"
}
```

### 3.2 リアルタイムエラー監視

#### DebuggerInjector拡張
```javascript
// 既存のunified-frontend-debugger.jsを拡張
const CreateFlowMonitor = {
  sessionTracking: true,
  phaseErrorDetection: true,
  automaticRetry: true,
  userNotification: true
}
```

### 3.3 回復可能性の実装

#### 自動リトライ機能
- Perplexity API一時エラー → 3回リトライ
- GPT生成失敗 → 異なるtemperatureで再試行
- Claude生成失敗 → フォールバックプロンプト使用
- 投稿失敗 → 下書き状態保持＋手動リトライ可能

## 🧪 Phase 4: 総合テスト・品質保証（2-3日）

### 4.1 エンドツーエンドテストスイート

#### テストシナリオ設計
```bash
# フローテストスクリプト作成
test-scripts/
├── test-complete-flow-e2e-20250619.js      # 完全フロー
├── test-error-recovery-20250619.js         # エラー回復
├── test-concurrent-sessions-20250619.js    # 同時セッション
└── test-edge-cases-20250619.js            # エッジケース
```

#### 具体的テストケース
1. **Happy Path**: テーマ入力→コンセプト選択→投稿完了
2. **Error Recovery**: 各フェーズでのエラー発生→回復
3. **Edge Cases**: 空データ、極端に長いテキスト、特殊文字
4. **Performance**: 複数セッション同時実行、大量データ処理
5. **Security**: インジェクション攻撃、権限チェック

### 4.2 パフォーマンス最適化

#### データベース最適化
```sql
-- インデックス追加
CREATE INDEX idx_create_session_status ON create_sessions(status);
CREATE INDEX idx_content_draft_session ON content_drafts(session_id);
CREATE INDEX idx_content_draft_status ON content_drafts(status);
```

#### API レスポンス最適化
- 不要フィールドの除外
- ページネーション実装
- キャッシュ戦略の適用

### 4.3 ドキュメント更新

#### API仕様書作成
```markdown
# Create→Post API仕様
## 1. Flow Management
### POST /api/create/flow/start
### GET /api/create/flow/[id]/status  
### POST /api/create/flow/[id]/proceed

## 2. Content Generation
### POST /api/intel/collect/topics
### POST /api/create/concept/generate
### POST /api/create/content/generate

## 3. Draft Management
### GET /api/create/draft/list
### PUT /api/create/draft/[id]

## 4. Publishing
### POST /api/publish/post/now
```

## 📊 Phase 5: 統合システム準備（1-2日）

### 5.1 Intelligence システム接続準備

#### NEWS×Create 統合ポイント
```typescript
// ニュース記事→バイラルコンテンツ生成
interface NewsToViralFlow {
  newsArticleId: string
  generateFromNews: (articleId: string) => CreateSession
  hybridGeneration: boolean  // ニュース+独自テーマ
}
```

### 5.2 Analytics システム接続準備

#### 投稿結果→分析データ連携
```typescript
interface PostAnalyticsFlow {
  trackingEnabled: boolean
  metricsCollection: 'realtime' | 'batch'
  performanceAnalysis: boolean
}
```

### 5.3 統合ダッシュボード準備

#### Mission Control 統合
- Create フローの状態表示
- リアルタイム進行状況
- エラー状況の可視化
- パフォーマンス指標

## 🎯 Phase 6: プロダクション準備（1日）

### 6.1 本番環境設定

#### 環境変数検証
```bash
# 必須環境変数チェック
node scripts/dev-tools/check-env.js --production-ready
```

#### セキュリティ監査
- API Key ローテーション
- 認証・認可の確認
- レート制限の設定

### 6.2 監視・ロギング

#### アプリケーション監視
```javascript
const MonitoringConfig = {
  errorTracking: 'sentry',
  performanceMonitoring: true,
  userAnalytics: true,
  apiMetrics: true
}
```

### 6.3 デプロイメント戦略

#### Vercel デプロイ最適化
- ビルド最適化
- 環境変数設定
- カスタムドメイン設定
- CDN最適化

## 📈 成功指標・KPI

### Phase完了基準
- [ ] **Phase 1**: 0エラーでの完全フロー実行
- [ ] **Phase 2**: 統合計画準拠のAPI構造
- [ ] **Phase 3**: 自動エラー回復率 90%以上
- [ ] **Phase 4**: E2Eテスト成功率 100%
- [ ] **Phase 5**: 他システム連携準備完了
- [ ] **Phase 6**: 本番デプロイ可能状態

### Create→Draft→Post システム与件達成チェック

#### 🎯 プロンプト品質保証（最重要）
- [ ] **プロンプト正規化の禁止**: 既存プロンプトを勝手に変更していない
- [ ] **プロンプトエディター使用**: すべてのプロンプト変更がバージョン管理されている
- [ ] **LLMリクエスト追加禁止**: 無許可のLLM呼び出しを追加していない
- [ ] **出力精度維持**: Perplexity→GPT→Claudeの出力結果が劣化していない

#### 🛠️ 技術要件達成
- [ ] **ViralDraftV2完全移行**: 旧ViralDraftテーブルを使用していない
- [ ] **DB根本解決**: モックデータやスキップ処理を使用していない
- [ ] **Prisma正式対処**: すべてのDB操作がPrismaを通じて実行されている
- [ ] **エラー記録**: すべての修正がerror-recorderで記録されている

#### 🚀 機能要件達成
- [ ] **完全フロー動作**: テーマ入力→トピック収集→コンセプト生成→キャラクター選択→下書き作成→投稿完了
- [ ] **2トピック×6コンセプト**: GPT出力で正しい数量が生成されている
- [ ] **キャラクター機能**: カーディ・ダーレでの投稿生成が動作している
- [ ] **ハッシュタグ自動追加**: システムが適切なハッシュタグを付与している

#### 🔄 データフロー整合性
- [ ] **Perplexity→GPT**: topicsフィールドからconceptsへの正しい変換
- [ ] **GPT→Claude**: selectedIdsからselectedConceptsへの正しい変換
- [ ] **Claude→Draft**: generatedPostsからViralDraftV2への正しい保存
- [ ] **Draft→Post**: ViralDraftV2からTwitter投稿への正しい実行

#### 🎨 UI/UX要件達成
- [ ] **プログレッシブ表示**: 各フェーズの結果が適切に表示されている
- [ ] **リアルタイム更新**: ステータス変更が即座に反映されている
- [ ] **エラー表示**: ユーザーにわかりやすいエラーメッセージが表示されている
- [ ] **下書き管理**: 編集・削除・投稿機能が完全に動作している

### 継続的品質指標
- フロー完了率: 95%以上
- 平均処理時間: 60秒以内
- エラー発生率: 5%未満
- ユーザー体験スコア: 4.5/5以上
- **プロンプト出力品質**: 既存レベル以上を維持（最重要）

## 🛡️ リスク管理

### 技術的リスク
- **プロンプト変更による出力品質低下**: プロンプトエディターでのA/Bテスト
- **API制限による処理停止**: フォールバック機構とレート制限管理
- **DB性能劣化**: インデックス最適化とクエリ改善

### 運用的リスク
- **データ損失**: 自動バックアップとトランザクション保護
- **セキュリティ侵害**: 定期的な脆弱性スキャンと権限管理
- **可用性低下**: 冗長化とヘルスチェック

## 📅 実装スケジュール

### タイムライン（7-10日間）
```
Week 1:
├── Day 1-2: Phase 1 (現状分析・エラー調査)
├── Day 3-5: Phase 2 (命名規則統一)
└── Day 6-7: Phase 3 (エラーハンドリング)

Week 2:
├── Day 8-10: Phase 4 (総合テスト)
├── Day 11-12: Phase 5 (統合準備)
└── Day 13: Phase 6 (本番準備)
```

### マイルストーン
- **Week 1 End**: Create→Post フロー安定化
- **Week 2 Mid**: 統合システム準備完了
- **Week 2 End**: プロダクション投入可能

## 🔄 次のステップ

1. **Phase 1開始**: 現状分析スクリプトの実行
2. **優先度判定**: エラーの重要度分類
3. **実装順序決定**: 影響度の高い問題から解決
4. **プログレス追跡**: 日次進捗レビュー

---

この計画に従って、現在のCreate→Postフローを統合システム計画に準拠した堅牢なシステムに進化させます。