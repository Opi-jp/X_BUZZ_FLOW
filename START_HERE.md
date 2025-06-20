# 🚀 X_BUZZ_FLOW - START HERE

## ⚡ Claudeへの重要な指示
**不要なファイル読み込みを避けて、最小限の情報で回答してください。**
**追加情報が必要な場合のみ、明示的に指定されたファイルを読んでください。**

## 📚 ドキュメント優先順位

1. **このファイル** - 最初に読む（今読んでいる）
2. **ERRORS.md** - エラーが発生したら真っ先に確認
3. **MASTER_DOC.md** - 詳細情報が必要な時
4. **CLAUDE.md** - 開発の詳細ガイドライン

## 🏃 最小限の開始手順

```bash
# 1. サーバー起動（必須）
./scripts/dev-persistent.sh

# 2. エラーが出たら
cat ERRORS.md | grep "エラー内容"
# または
node scripts/dev-tools/find-error.js "エラー内容"
```

## 🔧 現在のシステム構造（2025/06/20）

### APIエンドポイント
```
/api/flow          - フロー管理
/api/drafts        - 下書き管理  
/api/post          - 投稿実行
/api/generation/*  - コンテンツ生成（旧構造）
/api/intelligence/* - 情報収集（旧構造）
```

### 重要な開発ツール
```bash
# 統合開発ツール
node scripts/dev-tools/dev-tools.js check

# プロンプトエディター
node scripts/dev-tools/prompt-editor.js list

# API依存関係確認
node scripts/dev-tools/api-dependency-scanner.js
```

## ⚠️ 絶対に守るルール

1. **ポート3000必須** - Twitter OAuth認証の制約
2. **新規ドキュメント作成禁止** - NO_MORE_DOCS.md参照
3. **プロンプト変更時** - Chain of Thought仕様書を必ず確認
4. **DBエラー時** - モックデータ使用禁止、Prismaで正式対処

## 🆘 困ったときの順番

1. ERRORS.mdを確認
2. find-errorツールで検索
3. MASTER_DOC.mdの該当セクションを読む
4. それでも解決しない場合のみ全体を調査

---

**Remember**: Less is more. 必要最小限の情報で問題を解決する。