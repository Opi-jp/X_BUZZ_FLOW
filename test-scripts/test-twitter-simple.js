#!/usr/bin/env node

/**
 * シンプルなTwitter投稿準備スクリプト
 * リライト済みコンテンツを表示して、ブラウザでの投稿を促す
 */

const fs = require('fs')
const readline = require('readline')

async function main() {
  console.log('=== Twitter投稿準備 ===\n')
  
  // リライト済みコンテンツを読み込む
  const rewriteFiles = fs.readdirSync('.')
    .filter(f => f.startsWith('claude-rewrite-') && f.endsWith('.json'))
    .sort()
    .reverse()
  
  if (rewriteFiles.length === 0) {
    console.error('リライト済みファイルが見つかりません')
    return
  }
  
  console.log('📄 利用可能なリライトファイル:')
  rewriteFiles.forEach((file, i) => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const toneName = data.rewritten?.toneName || data.customTone?.name || 'unknown'
    const timestamp = data.rewritten?.timestamp || data.timestamp
    console.log(`${i + 1}. ${toneName} (${new Date(timestamp).toLocaleString('ja-JP')})`)
  })
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const fileIndex = await new Promise((resolve) => {
    rl.question('\n使用するファイル番号を選択: ', (answer) => {
      rl.close()
      resolve(parseInt(answer) - 1)
    })
  })
  
  const selectedFile = rewriteFiles[fileIndex]
  const data = JSON.parse(fs.readFileSync(selectedFile, 'utf8'))
  
  // リライト済みコンテンツを抽出
  let posts = []
  if (data.rewritten?.content) {
    const matches = data.rewritten.content.match(/【投稿\d+】\n(.+?)(?=【投稿|$)/gs) || []
    posts = matches.map(m => m.replace(/【投稿\d+】\n/, '').trim())
  }
  
  if (posts.length === 0) {
    console.error('投稿コンテンツが見つかりません')
    return
  }
  
  console.log(`\n📝 ${posts.length}個の投稿が見つかりました\n`)
  
  // 各投稿を表示
  posts.forEach((post, i) => {
    console.log(`━━━ 投稿${i + 1} ━━━`)
    console.log(post)
    console.log(`文字数: ${post.length}`)
    console.log('')
  })
  
  console.log('━'.repeat(50))
  console.log('\n🚀 投稿方法:')
  console.log('\n【方法1: 開発サーバー経由】')
  console.log('1. 別のターミナルで: npm run dev')
  console.log('2. ブラウザで: http://localhost:3000')
  console.log('3. Twitterでログイン')
  console.log('4. 「新規投稿」ボタンから投稿')
  
  console.log('\n【方法2: 直接Twitter】')
  console.log('1. https://twitter.com にアクセス')
  console.log('2. 上記のコンテンツをコピー＆ペースト')
  console.log('3. 「ポスト」ボタンをクリック')
  
  console.log('\n【方法3: スレッド投稿】')
  console.log('1. 最初の投稿を投稿')
  console.log('2. 「返信」ボタンから続きを投稿')
  console.log('3. 全ての投稿を繋げてスレッド化')
  
  // クリップボードにコピー（最初の投稿のみ）
  try {
    const { exec } = require('child_process')
    const firstPost = posts[0]
    
    // macOSのpbcopyコマンドを使用
    exec('pbcopy', (error, stdout, stderr) => {
      if (!error) {
        console.log('\n✅ 最初の投稿をクリップボードにコピーしました！')
      }
    }).stdin.end(firstPost)
  } catch (e) {
    // エラーは無視（クリップボードは必須ではない）
  }
  
  // 投稿用のJSONファイルを作成
  const exportData = {
    posts: posts,
    metadata: {
      tone: data.rewritten?.toneName || data.customTone?.name,
      originalFile: selectedFile,
      exportedAt: new Date().toISOString()
    }
  }
  
  const exportFile = `twitter-ready-${Date.now()}.json`
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2))
  console.log(`\n💾 投稿用データを保存: ${exportFile}`)
}

// 実行
main().catch(console.error)