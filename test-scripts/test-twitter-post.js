#!/usr/bin/env node

/**
 * Twitter投稿テスト
 * Claudeでリライトしたコンテンツを実際に投稿
 */

require('dotenv').config({ path: '.env.local' })
const { TwitterApi } = require('twitter-api-v2')
const fs = require('fs')
const readline = require('readline')

// Twitter API v2クライアントを作成
async function createTwitterClient() {
  // OAuth 2.0 App-only認証用のBearer Token取得
  const client = new TwitterApi({
    appKey: process.env.TWITTER_CLIENT_ID,
    appSecret: process.env.TWITTER_CLIENT_SECRET,
  })
  
  // App-only認証
  const appOnlyClient = await client.appLogin()
  return appOnlyClient
}

// ユーザー認証が必要な場合のフロー
async function authenticateUser() {
  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  })

  // OAuth 2.0 PKCE認証フロー
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    'http://localhost:3000/auth/twitter/callback',
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  )

  console.log('\n🔗 以下のURLにアクセスして認証してください:')
  console.log(url)
  console.log('\n認証後、callbackのcodeパラメータを入力してください。')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const code = await new Promise((resolve) => {
    rl.question('認証コード: ', (answer) => {
      rl.close()
      resolve(answer)
    })
  })

  try {
    const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: 'http://localhost:3000/auth/twitter/callback',
    })

    console.log('\n✅ 認証成功！')
    console.log('アクセストークン（最初の20文字）:', accessToken.substring(0, 20) + '...')
    
    // トークンを保存
    const tokens = {
      accessToken,
      refreshToken,
      timestamp: new Date().toISOString()
    }
    
    fs.writeFileSync('twitter-tokens.json', JSON.stringify(tokens, null, 2))
    console.log('💾 トークンを twitter-tokens.json に保存しました')
    
    return loggedClient
  } catch (error) {
    console.error('❌ 認証エラー:', error)
    throw error
  }
}

// 保存されたトークンから認証
async function authenticateFromSavedToken() {
  try {
    const tokens = JSON.parse(fs.readFileSync('twitter-tokens.json', 'utf8'))
    console.log('💾 保存されたトークンを使用します')
    
    const client = new TwitterApi(tokens.accessToken)
    
    // トークンの有効性を確認
    const me = await client.v2.me()
    console.log(`✅ ログイン中のユーザー: @${me.data.username}`)
    
    return client
  } catch (error) {
    console.log('⚠️ 保存されたトークンが無効または見つかりません')
    return null
  }
}

// テスト投稿
async function testPost(client, content) {
  try {
    console.log('\n📝 投稿内容:')
    console.log(content)
    console.log(`\n文字数: ${content.length}`)
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const confirm = await new Promise((resolve) => {
      rl.question('\nこの内容で投稿しますか？ (y/n): ', (answer) => {
        rl.close()
        resolve(answer.toLowerCase() === 'y')
      })
    })

    if (!confirm) {
      console.log('投稿をキャンセルしました')
      return
    }

    console.log('\n🚀 投稿中...')
    const tweet = await client.v2.tweet(content)
    
    console.log('\n✅ 投稿成功！')
    console.log('Tweet ID:', tweet.data.id)
    console.log(`URL: https://twitter.com/i/web/status/${tweet.data.id}`)
    
    return tweet
  } catch (error) {
    console.error('\n❌ 投稿エラー:', error)
    
    if (error.data) {
      console.error('エラー詳細:', JSON.stringify(error.data, null, 2))
    }
    
    throw error
  }
}

// メイン処理
async function main() {
  console.log('=== Twitter投稿テスト ===\n')
  
  // まず保存されたトークンを試す
  let client = await authenticateFromSavedToken()
  
  // なければ新規認証
  if (!client) {
    console.log('\n新規認証が必要です')
    client = await authenticateUser()
  }
  
  // リライト済みコンテンツを読み込む
  const rewriteFiles = fs.readdirSync('.')
    .filter(f => f.startsWith('claude-rewrite-') && f.endsWith('.json'))
    .sort()
    .reverse()
  
  if (rewriteFiles.length === 0) {
    console.error('リライト済みファイルが見つかりません')
    return
  }
  
  console.log('\n📄 利用可能なリライトファイル:')
  rewriteFiles.forEach((file, i) => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const toneName = data.rewritten?.toneName || data.customTone?.name || 'unknown'
    console.log(`${i + 1}. ${file} (${toneName})`)
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
    // UI版の形式
    const matches = data.rewritten.content.match(/【投稿\d+】\n(.+?)(?=【投稿|$)/gs) || []
    posts = matches.map(m => m.replace(/【投稿\d+】\n/, '').trim())
  } else if (data.rewritten?.neutral?.content) {
    // 複数文体版の形式
    const matches = data.rewritten.neutral.content.match(/【投稿\d+】\n(.+?)(?=【投稿|$)/gs) || []
    posts = matches.map(m => m.replace(/【投稿\d+】\n/, '').trim())
  }
  
  if (posts.length === 0) {
    console.error('投稿コンテンツが見つかりません')
    return
  }
  
  console.log(`\n📝 ${posts.length}個の投稿が見つかりました`)
  console.log('\nどの投稿をテストしますか？')
  console.log('1. 最初の投稿（オープニング）')
  console.log('2. すべての投稿を順番に（スレッド形式）')
  console.log('3. 特定の番号を選択')
  
  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const choice = await new Promise((resolve) => {
    rl2.question('\n選択 (1-3): ', (answer) => {
      rl2.close()
      resolve(parseInt(answer))
    })
  })
  
  if (choice === 1) {
    // 最初の投稿のみ
    await testPost(client, posts[0])
  } else if (choice === 2) {
    // スレッド形式で投稿
    console.log('\n⚠️ スレッド形式での投稿を開始します')
    let previousTweetId = null
    
    for (let i = 0; i < posts.length; i++) {
      console.log(`\n--- 投稿 ${i + 1}/${posts.length} ---`)
      
      const tweetData = {
        text: posts[i]
      }
      
      // 2つ目以降はリプライとして投稿
      if (previousTweetId) {
        tweetData.reply = {
          in_reply_to_tweet_id: previousTweetId
        }
      }
      
      try {
        const tweet = await client.v2.tweet(tweetData)
        previousTweetId = tweet.data.id
        console.log(`✅ 投稿${i + 1}完了: https://twitter.com/i/web/status/${tweet.data.id}`)
        
        // レート制限対策で少し待つ
        if (i < posts.length - 1) {
          console.log('5秒待機中...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      } catch (error) {
        console.error(`❌ 投稿${i + 1}失敗:`, error.message)
        break
      }
    }
  } else if (choice === 3) {
    // 特定の番号を選択
    const rl3 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const postNum = await new Promise((resolve) => {
      rl3.question(`\n投稿番号 (1-${posts.length}): `, (answer) => {
        rl3.close()
        resolve(parseInt(answer) - 1)
      })
    })
    
    if (postNum >= 0 && postNum < posts.length) {
      await testPost(client, posts[postNum])
    } else {
      console.error('無効な番号です')
    }
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('未処理のエラー:', error)
  process.exit(1)
})

// 実行
main().catch(console.error)