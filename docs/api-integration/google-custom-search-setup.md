# Google Custom Search API セットアップガイド

## 概要
Chain of Thoughtの検索フェーズで使用するGoogle Custom Search APIの設定方法を説明します。

## 1. Google Cloud Consoleでの設定

### 1.1 APIキーの取得
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「APIキー」をクリック
5. 生成されたAPIキーをコピー

### 1.2 Custom Search APIの有効化
1. 「APIとサービス」→「ライブラリ」に移動
2. 「Custom Search API」を検索
3. 「有効にする」をクリック

### 1.3 使用制限の設定（推奨）
1. APIキーの設定画面で「キーを制限」
2. 「APIの制限」で「Custom Search API」のみを選択
3. 必要に応じてIPアドレス制限も設定

## 2. カスタム検索エンジンの作成

### 2.1 検索エンジンの設定
1. [Programmable Search Engine](https://programmablesearchengine.google.com/)にアクセス
2. 「新しい検索エンジンを作成」をクリック
3. 検索エンジンの設定：
   - 名前: `X_BUZZ_FLOW Search`
   - 検索対象: `ウェブ全体を検索`を選択
   - 言語: 日本語と英語を追加

### 2.2 検索エンジンIDの取得
1. 作成した検索エンジンの「設定」に移動
2. 「基本」タブで「検索エンジンID」をコピー

## 3. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Google Custom Search API
GOOGLE_API_KEY=your-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
```

## 4. 使用制限と料金

### 無料枠
- 1日あたり100クエリまで無料
- それ以降は1,000クエリあたり$5

### 推奨設定
- 開発環境では1日の上限を100に設定
- 本番環境では予算に応じて上限を設定

## 5. 実装での使用方法

`/lib/google-search.ts`で実装済みの関数を使用：

```typescript
import { googleSearch } from '@/lib/google-search'

// 基本的な検索
const results = await googleSearch.search('AI workplace automation latest')

// ニュース検索（7日以内）
const news = await googleSearch.searchNews('AI skills wage gap', 7)

// 日本語コンテンツ検索
const jpResults = await googleSearch.searchJapanese('AI 働き方 最新')

// SNS検索
const tweets = await googleSearch.searchSocial('AI agent discussion', 'twitter')

// バッチ検索
const batchResults = await googleSearch.batchSearch([
  'AI agent workplace automation',
  'AI skills wage gap report',
  'AI 4 day work week trend'
])
```

## 6. トラブルシューティング

### エラー: "API key not valid"
- APIキーが正しくコピーされているか確認
- Custom Search APIが有効化されているか確認

### エラー: "Invalid search engine ID"
- 検索エンジンIDが正しいか確認
- 検索エンジンが「ウェブ全体を検索」に設定されているか確認

### 検索結果が0件
- 検索クエリを英語に変更してみる
- dateRestrictパラメータを調整する

## 7. 最適化のヒント

1. **クエリの最適化**
   - 具体的なキーワードを使用
   - 時間指定（latest, 2025など）を含める
   - site:指定で特定サイトに限定

2. **結果のキャッシュ**
   - 同じクエリは一定時間キャッシュ
   - Redisなどを使用して実装可能

3. **並列処理**
   - batchSearchを使用して複数クエリを効率的に処理

## 8. セキュリティ

- APIキーは絶対にクライアントサイドで使用しない
- 環境変数として管理し、コミットしない
- 本番環境ではIP制限を設定