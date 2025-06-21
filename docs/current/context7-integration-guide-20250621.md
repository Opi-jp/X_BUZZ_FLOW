# Context7 MCP統合ガイド

作成日: 2025年6月21日

## 概要

Context7は、Claude DesktopでMCP（Model Context Protocol）を通じて外部ツールと連携するためのサービスです。X_BUZZ_FLOWプロジェクトの開発効率を向上させるため、Context7を統合しました。

## セットアップ手順

### 1. Claude Desktop設定

`claude_desktop_config.json`に以下を追加：

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### 2. Claude Desktopの再起動

設定後、Claude Desktopアプリケーションを完全に再起動してください。

## X_BUZZ_FLOWでの活用方法

### 1. プロジェクトコンテキストの管理

```bash
# プロジェクト情報の保存
"X_BUZZ_FLOWプロジェクトの以下の情報を記憶してください：
- バックエンド: Create→Draft→Postフロー完成
- フロントエンド: Phase 2実装開始
- 最新の問題: TailwindCSS読み込みエラー
- 次のタスク: 16ステップフローのUI実装"

# 保存した情報の取得
"X_BUZZ_FLOWプロジェクトの現在の状況を教えてください"
```

### 2. ライブラリ検索とコードスニペット

#### 推奨ライブラリ

| ライブラリ | Context7 ID | 用途 | Trust Score | スニペット数 |
|-----------|------------|------|-------------|-------------|
| React Tweet | /vercel/react-tweet | ツイート埋め込み | 10 | 46 |
| React Spring | /pmndrs/react-spring | アニメーション | 9.6 | 167 |
| React Window | /bvaughn/react-window | 大量リスト最適化 | 10 | 6 |
| React Hook Form | /react-hook-form/react-hook-form | フォーム管理 | - | - |
| React Query | /tanstack/query | データフェッチング | - | - |

#### 使用例

```bash
# React Tweetの実装例
"React Tweetを使ったツイート埋め込みのコード例を表示してください"

# アニメーション実装
"React Springを使ったフェードインアニメーションの例を教えてください"

# 仮想スクロール実装
"React Windowで大量の投稿リストを表示する方法を教えてください"
```

### 3. エラー解決履歴の管理

```bash
# エラー情報の記録
"X_BUZZ_FLOWで発生したエラーを記憶してください：
- エラー: TailwindCSS読み込みエラー
- 原因: postcss.config.jsの設定不備
- 解決方法: npm install -D postcss autoprefixer"

# エラー履歴の確認
"X_BUZZ_FLOWで発生したエラーとその解決方法を教えてください"
```

### 4. 開発進捗の追跡

```bash
# 進捗の記録
"X_BUZZ_FLOWのフロントエンド実装進捗を更新してください：
- 完了: 基本設計、コンポーネント設計
- 進行中: TailwindCSS問題解決
- 次: 16ステップフローの実装"

# 進捗確認
"X_BUZZ_FLOWのフロントエンド実装の進捗状況を教えてください"
```

## ベストプラクティス

### 1. 定期的なコンテキスト更新
- 作業開始時に前回の状況を確認
- 重要な変更や決定事項を記録
- エラーと解決方法をペアで保存

### 2. ライブラリ選定
- Trust Scoreが高いライブラリを優先
- コードスニペット数が多いものは実装例が豊富
- プロジェクトのニーズに合致するものを選択

### 3. 効率的な検索
```bash
# 具体的な要件で検索
"Next.js 15と互換性のあるフォーム管理ライブラリを探してください"

# 複数の選択肢を比較
"React QueryとSWRのコード例を比較して見せてください"
```

## 注意事項

1. **Context7の制限**
   - ライブラリ検索は主にReact/JavaScriptエコシステムに特化
   - コードスニペットは一般的な使用例が中心

2. **プライバシー**
   - 機密情報は保存しない
   - 公開可能な技術情報のみを記録

3. **更新頻度**
   - ライブラリ情報は定期的に更新される
   - バージョン情報に注意

## まとめ

Context7の統合により、X_BUZZ_FLOWプロジェクトの開発効率が向上します：
- プロジェクトコンテキストの永続化
- ライブラリ検索の効率化
- エラー解決ノウハウの蓄積
- 開発進捗の可視化

これらの機能を活用して、より効率的な開発を実現しましょう。