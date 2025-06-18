# X_BUZZ_FLOW サーバー再起動ガイド

## 🚨 永続サーバ古いコード問題の解決

### 問題の発生パターン
- Node.jsの長時間実行でファイル更新が反映されない
- プロセスが数時間前のコードを実行し続ける
- 開発者がコードを修正してもテスト結果に反映されない

### 確認コマンド
```bash
# 実行中のプロセスを確認
ps aux | grep -i "node\|next" | grep -v grep

# tmuxセッション確認
tmux list-sessions

# プロセス開始時刻確認（古いコードの可能性）
ps -o pid,lstart,command | grep next-server
```

### 再起動手順

#### 1. 開発サーバー停止
```bash
# tmuxセッションから停止
tmux attach-session -t xbuzz
# Ctrl+C で開発サーバー停止

# または強制的にプロセス終了
pkill -f "next dev"
pkill -f "next-server"
pkill -f "async-worker"
```

#### 2. クリーンな再起動
```bash
# プロジェクトディレクトリに移動
cd /Users/yukio/X_BUZZ_FLOW

# 依存関係の再インストール（必要に応じて）
npm install

# 永続サーバー再起動
./scripts/dev-persistent.sh
```

#### 3. 動作確認
```bash
# サーバー状態確認
curl http://localhost:3000/api/health

# プロセス確認（新しい時刻で起動されているか）
ps -o pid,lstart,command | grep next-server
```

### 予防策

#### 定期的な再起動設定
```bash
# crontabに追加（毎朝8時に自動再起動）
0 8 * * * cd /Users/yukio/X_BUZZ_FLOW && ./scripts/dev-persistent.sh
```

#### コード変更時の再起動チェック
```bash
# ファイル監視でコード変更検知時に再起動
# .git/hooks/post-commit に追加:
#!/bin/bash
echo "Code changed. Consider restarting persistent server."
echo "Run: ./scripts/dev-persistent.sh"
```

## 🛠️ DB認証問題の解決

### 現在の問題
- Prisma接続でPERMISSION_DENIEDエラー頻発
- 接続文字列の設定ミス
- 環境変数の不整合

### 解決ツール作成
```bash
# DB接続診断ツール
./scripts/db-health-check.sh

# DB認証設定修復ツール
./scripts/fix-db-auth.sh
```

## 🧪 テストスクリプト整理

### 現状の問題
- 309個のテストファイルが乱立
- 重複機能のテストが大量存在
- 何を何に使うかわからない状態

### 整理方針
1. **カテゴリ別フォルダ分け**
   - `/test-scripts/api/` - API テスト
   - `/test-scripts/character/` - キャラクター生成テスト
   - `/test-scripts/cot/` - Chain of Thought テスト
   - `/test-scripts/db/` - データベーステスト
   - `/test-scripts/integration/` - E2E テスト

2. **重複ファイル削除**
   - 同じ機能をテストする複数ファイルを統合
   - 古いバージョンのテストファイル削除

3. **統合テストツール作成**
```bash
# 全機能テスト実行
./scripts/run-all-tests.sh

# 特定機能テスト実行
./scripts/test-specific.sh [category]
```

## 📝 注意事項

### 必須手順
1. **tmux永続化**: Twitter OAuth認証のためポート3000固定必須
2. **DB接続確認**: 毎回起動時にDB疎通確認
3. **環境変数同期**: .env.localとVercelの環境変数同期確認

### 警告サイン
- APIレスポンスが古い結果を返す
- コード修正が反映されない
- テストが予期しない結果を返す
- DB接続エラーが頻発する

これらの症状が出た場合は即座に再起動を実行してください。