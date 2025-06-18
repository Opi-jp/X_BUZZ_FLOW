# 📛 ドキュメント作成禁止令

## これ以上ドキュメントを作らない！

現在79個のドキュメントがあり、誰も読まない・管理できない状態です。

## ✅ 使うべきドキュメント（これだけ）

1. **CLAUDE.md** - セッション開始時の手順
2. **MASTER_DOC.md** - 現在の状態と基本ルール
3. **ERRORS.md** - エラー解決集
4. **プロンプト関連**（例外：コードに書けないため）
   - `chain-of-thought-specification.md` - CoTプロンプト仕様
   - `prompt-master-specification.md` - バージョン管理

## ❌ 新規ドキュメント作成は禁止

代わりに：
- 一般的な情報 → MASTER_DOC.mdに追記
- エラー関連 → ERRORS.mdに追記
- 作業記録 → gitコミットメッセージで十分
- 設計書 → コードにコメントで書く

## 🗑️ 古いドキュメントは無視

- `/docs/` 以下の79個のファイルは基本的に無視
- 必要なら `node scripts/dev-tools/doc-finder.js` で検索
- でも多分必要ない

## 📝 情報の記録方法

1. **コードにコメントを書く**
   ```typescript
   // ❌ 使用禁止: 旧API
   // ✅ 使用推奨: /api/generation/content/sessions/[id]
   // 📅 2025/06/18更新 - naming-convention-redesignに基づく
   ```

2. **エラーはERRORS.mdに**
   ```bash
   node scripts/dev-tools/error-recorder.js
   ```

3. **重要な決定はMASTER_DOC.mdに**
   - 1行で追記
   - 長い説明は不要

---

このルールを破ってドキュメントを作成した場合、次のセッションで削除されます。