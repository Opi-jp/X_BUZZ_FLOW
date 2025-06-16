# 重要ドキュメント一覧（次回セッション用）

## 必須参照ドキュメント

### 1. プロジェクト概要・作業記録
- `/Users/yukio/X_BUZZ_FLOW/CLAUDE.md`
  - プロジェクトの背景・目標
  - 最新の作業記録（2025/06/12まで）
  - 環境変数情報

### 2. 最新実装サマリー
- `/Users/yukio/X_BUZZ_FLOW/docs/implementation-summary-20250612-evening.md`
  - Chain of Thought実装の詳細
  - 技術的な解決事項
  - 動作確認結果

### 3. Chain of Thought実装ガイド
- `/Users/yukio/X_BUZZ_FLOW/docs/chain-of-thought-implementation.md`
  - 5フェーズアプローチの詳細
  - プロンプト構造
  - 実装要件

## 主要コードファイル

### APIエンドポイント
1. **Chain of Thought Hybrid**
   - `/app/api/viral/gpt-session/[sessionId]/chain-hybrid/route.ts`
   - Web検索 + Function Calling実装

2. **高速生成**
   - `/app/api/viral/gpt-session/[sessionId]/chain-fast/route.ts`
   - 5秒以内の投稿生成

3. **セッション管理**
   - `/app/api/viral/gpt-session/create/route.ts`
   - セッション作成・初期化

### UIコンポーネント
1. **メインページ**
   - `/app/viral/gpt/page.tsx`
   - 3つの実行モード選択UI

2. **セッション詳細**
   - `/app/viral/gpt/session/[sessionId]/page.tsx`
   - 結果表示・Chain of Thought実行

## 参照不要なドキュメント（アーカイブ）

以下のドキュメントは古い実装や解決済みの問題に関するものです：

- `/docs/chatgpt-to-api-migration.md` - 移行完了
- `/docs/troubleshooting-web-search.md` - 問題解決済み
- `/docs/web-search-debug-guide.md` - デバッグ完了
- `/docs/web-search-limitations.md` - Hybrid実装で解決
- `/docs/openai-responses-api-guide.md` - 実装完了
- `/docs/viral-automation-roadmap.md` - 古いロードマップ
- `/docs/chatgpt-viral-strategy.md` - 旧戦略（GPT分析に統合）

## デバッグ用エンドポイント

- `/api/viral/test-web-search` - Web検索機能のテスト
- `/api/viral/models` - 利用可能なモデル一覧

## 環境設定

```bash
# 必須環境変数
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10
ANTHROPIC_API_KEY=sk-ant-...（既存機能用）
```

## 次回作業時のチェックリスト

1. [ ] Vercel環境変数の確認
2. [ ] データベース接続テスト
3. [ ] Chain of Thought実行テスト（50-60秒）
4. [ ] 高速生成テスト（5秒以内）
5. [ ] エラーログの確認