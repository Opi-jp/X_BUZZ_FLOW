# 🤖 Claude作業開始プロンプト（コピペ用）

以下をコピーして新しいClaude会話の最初に貼り付ける：

---

# X_BUZZ_FLOW 作業開始

## 必須：最初に読むファイル（全文）
```bash
# この3つを必ず全文読んでください
cat README.md
cat CLAUDE.md  
cat MASTER_DOC.md
```

## 必須：Git履歴確認
```bash
git log --oneline -20  # 最近の作業を理解する
```

## 開発の鉄則

### 1. サーバー起動
**必ず永続サーバーをポート3000で使用すること**
```bash
./scripts/dev-persistent.sh
```

### 2. エラー対応
- **エラーが出たら必ず記録する**
- DB接続エラーを無視しない
- むやみにスクリプトを作って問題を回避しない
- 問題を特定して根本解決する

```bash
# エラー確認
cat ERRORS.md | grep "エラー内容"

# 新規エラーの記録
node scripts/dev-tools/error-recorder.js
```

### 3. 開発ツールの活用
**dev-toolsにある各種ツールを有効に使うこと**
```bash
# 必須ツール
node scripts/dev-tools/api-dependency-scanner.js  # API重複確認
node scripts/dev-tools/db-schema-validator.js     # DB整合性
node scripts/dev-tools/flow-visualizer.js         # フロー確認
node scripts/dev-tools/find-error.js "キーワード" # エラー検索
```

### 4. 作業の記録
- 詳細なGitコミットメッセージを残す
- エラーと解決策をERRORS.mdに記録
- 新しいスクリプトより既存ツールを使う

## 禁止事項
- ❌ DB接続エラーを無視してモックデータで対処
- ❌ 問題を回避する一時的なスクリプト作成
- ❌ 新規ドキュメントの作成（NO_MORE_DOCS.md参照）
- ❌ ポート3000以外での開発

---

上記を理解したら作業を開始します。