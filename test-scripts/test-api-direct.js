#!/usr/bin/env node

/**
 * API直接テスト
 * curlコマンドを生成して、APIをテスト
 */

const fs = require('fs')

console.log('=== Twitter投稿API テストコマンド生成 ===\n')

// 最新のリライトファイルを読み込む
const rewriteFiles = fs.readdirSync('.')
  .filter(f => f.startsWith('claude-rewrite-') && f.endsWith('.json'))
  .sort()
  .reverse()

if (rewriteFiles.length === 0) {
  console.error('リライトファイルが見つかりません')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(rewriteFiles[0], 'utf8'))
let content = ''

if (data.rewritten?.content) {
  const match = data.rewritten.content.match(/【投稿1】\n(.+?)(?=【投稿|$)/s)
  content = match ? match[1].trim() : ''
}

if (!content) {
  console.error('コンテンツが見つかりません')
  process.exit(1)
}

console.log('📝 投稿内容:')
console.log(content)
console.log('')

console.log('🔧 以下の手順でAPIをテストしてください:\n')

console.log('1. ブラウザで http://localhost:3000 にログイン')
console.log('2. 開発者ツール > Application > Cookies')
console.log('3. "next-auth.session-token" の値をコピー')
console.log('4. 以下のコマンドを実行（SESSION_TOKENを置き換え）:\n')

// curlコマンドを生成
const curlCommand = `
# まず下書きを作成
curl -X POST http://localhost:3000/api/viral/drafts \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=SESSION_TOKEN" \\
  -d '{
    "content": ${JSON.stringify(content)},
    "hashtags": ["#AI", "#働き方改革"],
    "metadata": {
      "source": "api-test"
    }
  }'

# レスポンスからIDを取得して、投稿
# 例: {"id":"xxx-xxx-xxx"}

# そのIDを使って投稿
curl -X POST http://localhost:3000/api/viral/post-draft \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=SESSION_TOKEN" \\
  -d '{
    "draftId": "上で取得したID"
  }'
`.trim()

console.log(curlCommand)

console.log('\n\n💡 より簡単な方法:')
console.log('1. http://localhost:3000/viral/drafts にアクセス')
console.log('2. 「新規作成」ボタンをクリック')
console.log('3. 上記のコンテンツを貼り付け')
console.log('4. 「今すぐ投稿」ボタンをクリック')

// HTTPieコマンドも生成
console.log('\n\n🎯 HTTPieを使う場合:')
const httpieCommand = `
# HTTPieでの投稿（より見やすい）
http POST localhost:3000/api/viral/drafts \\
  Cookie:"next-auth.session-token=SESSION_TOKEN" \\
  content="${content}" \\
  hashtags:='["#AI", "#働き方改革"]'
`.trim()

console.log(httpieCommand)