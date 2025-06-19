#!/usr/bin/env node

/**
 * 環境変数を明示的に読み込んで投稿テスト
 * Date: 2025-01-19
 */

// 環境変数を読み込む
require('dotenv').config({ path: '.env.local' })

const chalk = require('chalk')

async function testDirectPost() {
  console.log(chalk.yellow('🚀 直接投稿テスト（環境変数確認）'))
  console.log(chalk.gray('===================================\n'))
  
  // 環境変数の確認
  console.log(chalk.blue('🔐 環境変数チェック:'))
  console.log(`TWITTER_API_KEY: ${process.env.TWITTER_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`)
  console.log(`TWITTER_API_SECRET: ${process.env.TWITTER_API_SECRET ? '✅ 設定済み' : '❌ 未設定'}`)
  console.log(`TWITTER_ACCESS_TOKEN: ${process.env.TWITTER_ACCESS_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`)
  console.log(`TWITTER_ACCESS_SECRET: ${process.env.TWITTER_ACCESS_SECRET ? '✅ 設定済み' : '❌ 未設定'}`)
  console.log(`TWITTER_CLIENT_ID: ${process.env.TWITTER_CLIENT_ID ? '✅ 設定済み' : '❌ 未設定'}`)
  console.log(`TWITTER_CLIENT_SECRET: ${process.env.TWITTER_CLIENT_SECRET ? '✅ 設定済み' : '❌ 未設定'}`)
  
  const testContent = `開発テスト投稿 from X_BUZZ_FLOW

カーディ・ダーレ（53歳）より
「人間は最適化できない。それが救いだ」

#開発テスト ${new Date().toLocaleTimeString('ja-JP')}`
  
  console.log(chalk.yellow('\n📱 投稿内容:'))
  console.log(chalk.gray('─'.repeat(50)))
  console.log(testContent)
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.gray(`文字数: ${testContent.length}\n`))
  
  try {
    // 既存のTwitter APIエンドポイントを使用
    const response = await fetch('http://localhost:3000/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: testContent })
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log(chalk.green('✅ 投稿成功!'))
      console.log(chalk.blue(`URL: ${result.url}`))
      console.log(chalk.gray(`Tweet ID: ${result.id}`))
      
      if (result.mock) {
        console.log(chalk.yellow('\n⚠️  モック投稿モード'))
        console.log('実際の投稿には、Twitter API認証情報が必要です')
      }
    } else {
      console.log(chalk.red('❌ 投稿失敗'))
      console.log('レスポンス:', result)
      
      if (result.error === 'Unauthorized') {
        console.log(chalk.yellow('\n💡 認証エラーの解決方法:'))
        console.log('1. NextAuthでTwitterログインする')
        console.log('2. または、Twitter API v1.1の認証情報を.env.localに設定する')
      }
    }
    
  } catch (error) {
    console.error(chalk.red('❌ リクエストエラー:'), error.message)
  }
}

async function checkApiRoute() {
  console.log(chalk.blue('\n🔍 APIルートの確認:'))
  
  try {
    // /api/twitter/postのコードを確認
    const fs = require('fs')
    const path = require('path')
    const apiPath = path.join(process.cwd(), 'app/api/twitter/post/route.ts')
    
    if (fs.existsSync(apiPath)) {
      console.log('✅ /api/twitter/post/route.ts が存在します')
      
      // USE_MOCK_POSTINGの値を確認
      const content = fs.readFileSync(apiPath, 'utf-8')
      const mockMatch = content.match(/USE_MOCK_POSTING\s*=\s*(true|false)/)
      if (mockMatch) {
        console.log(`USE_MOCK_POSTING: ${mockMatch[1]}`)
      }
    }
  } catch (error) {
    console.log('APIルートの確認でエラー:', error.message)
  }
}

async function main() {
  await checkApiRoute()
  await testDirectPost()
  
  console.log(chalk.blue('\n📌 次のステップ:'))
  console.log('1. モック投稿が成功したら、実際のTwitter認証を設定')
  console.log('2. ブラウザでログイン: http://localhost:3000/auth/signin')
  console.log('3. または、Twitter Developer Portalで新しいアプリを作成')
}

main().catch(console.error)