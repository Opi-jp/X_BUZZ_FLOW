#!/usr/bin/env node

/**
 * Twitter投稿APIテスト
 * 既存のAPIエンドポイントを使用して投稿
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const readline = require('readline')

// APIを使用した投稿
async function postViaAPI(draftId, sessionCookie) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}/api/viral/post-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        draftId: draftId
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'API error')
    }
    
    return data
  } catch (error) {
    console.error('API呼び出しエラー:', error)
    throw error
  }
}

// 下書きを作成
async function createDraft(content, hashtags, sessionCookie) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}/api/viral/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        content: content,
        hashtags: hashtags,
        metadata: {
          source: 'test-script',
          createdBy: 'Claude Rewrite Test'
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'API error')
    }
    
    return data
  } catch (error) {
    console.error('下書き作成エラー:', error)
    throw error
  }
}

// セッションCookieの手動入力を促す
async function getSessionCookie() {
  console.log('\n🔐 認証が必要です')
  console.log('\n以下の手順でセッションCookieを取得してください:')
  console.log('1. ブラウザで http://localhost:3000 にアクセス')
  console.log('2. Twitterでログイン')
  console.log('3. 開発者ツール > Application > Cookies')
  console.log('4. "next-auth.session-token" の値をコピー')
  console.log('\n※ Production環境の場合は "__Secure-next-auth.session-token" を探してください')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const cookie = await new Promise((resolve) => {
    rl.question('\nセッションCookieの値を入力: ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
  
  // Cookie形式に整形
  const cookieName = process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
    
  return `${cookieName}=${cookie}`
}

// メイン処理
async function main() {
  console.log('=== Twitter投稿APIテスト ===\n')
  
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
    const matches = data.rewritten.content.match(/【投稿\d+】\n(.+?)(?=【投稿|$)/gs) || []
    posts = matches.map(m => m.replace(/【投稿\d+】\n/, '').trim())
  } else if (data.rewritten?.neutral?.content) {
    const matches = data.rewritten.neutral.content.match(/【投稿\d+】\n(.+?)(?=【投稿|$)/gs) || []
    posts = matches.map(m => m.replace(/【投稿\d+】\n/, '').trim())
  }
  
  if (posts.length === 0) {
    console.error('投稿コンテンツが見つかりません')
    return
  }
  
  console.log(`\n📝 ${posts.length}個の投稿が見つかりました`)
  
  // 最初の投稿を選択
  console.log('\n最初の投稿をテストします:')
  console.log('─'.repeat(50))
  console.log(posts[0])
  console.log('─'.repeat(50))
  
  // ハッシュタグを抽出
  const hashtagMatches = posts[0].match(/#\S+/g) || []
  const content = posts[0].replace(/#\S+/g, '').trim()
  
  console.log(`\n文字数: ${content.length}`)
  console.log(`ハッシュタグ: ${hashtagMatches.join(' ')}`)
  
  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const confirm = await new Promise((resolve) => {
    rl2.question('\nこの内容で投稿しますか？ (y/n): ', (answer) => {
      rl2.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })

  if (!confirm) {
    console.log('投稿をキャンセルしました')
    return
  }
  
  // セッションCookieを取得
  const sessionCookie = await getSessionCookie()
  
  console.log('\n📝 下書きを作成中...')
  
  try {
    // 下書きを作成
    const draft = await createDraft(content, hashtagMatches, sessionCookie)
    console.log('✅ 下書き作成成功')
    console.log('下書きID:', draft.id)
    
    // 投稿
    console.log('\n🚀 投稿中...')
    const result = await postViaAPI(draft.id, sessionCookie)
    
    console.log('\n✅ 投稿成功！')
    console.log('Tweet ID:', result.tweetId)
    console.log('URL:', result.url)
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
  }
}

// 別の方法：直接データベースにアクセス
async function directDatabaseMethod() {
  console.log('\n=== 直接データベース方式 ===')
  console.log('この方法では、データベースに直接下書きを作成します')
  
  const { PrismaClient } = require('./app/generated/prisma')
  const prisma = new PrismaClient()
  
  try {
    // ユーザーを取得（最初のユーザーを使用）
    const user = await prisma.user.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (!user) {
      console.error('認証済みユーザーが見つかりません')
      console.log('先にブラウザでログインしてください')
      return
    }
    
    console.log(`\n✅ ユーザー見つかりました: ${user.name || user.username}`)
    
    // リライト済みコンテンツから下書きを作成
    const rewriteData = JSON.parse(
      fs.readFileSync('claude-rewrite-custom-1749839731226.json', 'utf8')
    )
    
    const content = rewriteData.rewritten.content.match(/【投稿1】\n(.+?)(?=【投稿|$)/s)[1].trim()
    const hashtags = content.match(/#\S+/g) || []
    const cleanContent = content.replace(/#\S+/g, '').trim()
    
    const draft = await prisma.contentDraft.create({
      data: {
        userId: user.id,
        content: cleanContent,
        editedContent: null,
        hashtags: hashtags,
        status: 'draft',
        conceptType: 'claude-rewrite',
        metadata: {
          source: 'claude-rewrite-test',
          tone: 'custom-sarcastic-but-kind'
        }
      }
    })
    
    console.log('\n✅ 下書きを作成しました')
    console.log('下書きID:', draft.id)
    console.log(`\n以下のURLで編集・投稿できます:`)
    console.log(`http://localhost:3000/viral/drafts/${draft.id}`)
    
  } catch (error) {
    console.error('データベースエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 実行モード選択
async function selectMode() {
  console.log('\n実行モードを選択してください:')
  console.log('1. API経由で投稿（セッションCookie必要）')
  console.log('2. データベースに下書き作成（編集画面で投稿）')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const mode = await new Promise((resolve) => {
    rl.question('\n選択 (1-2): ', (answer) => {
      rl.close()
      resolve(parseInt(answer))
    })
  })
  
  if (mode === 1) {
    await main()
  } else if (mode === 2) {
    await directDatabaseMethod()
  } else {
    console.log('無効な選択です')
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('未処理のエラー:', error)
  process.exit(1)
})

// 実行
selectMode().catch(console.error)