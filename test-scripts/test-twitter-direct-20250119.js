#!/usr/bin/env node

/**
 * Twitter API直接テスト
 * Date: 2025-01-19
 */

const chalk = require('chalk')

async function testTwitterPost() {
  console.log(chalk.blue('🐦 Twitter API 直接投稿テスト\n'))
  
  const testContent = `テスト投稿 from X_BUZZ_FLOW

カーディ・ダーレより
「人間は最適化できない。それが救いだ」

#開発テスト ${new Date().toLocaleTimeString('ja-JP')}`
  
  console.log(chalk.yellow('📝 投稿内容:'))
  console.log(chalk.gray('─'.repeat(50)))
  console.log(testContent)
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.gray(`文字数: ${testContent.length}\n`))
  
  try {
    // APIエンドポイントに直接リクエスト
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
        console.log(chalk.yellow('⚠️  モック投稿モード'))
      }
    } else {
      console.log(chalk.red('❌ 投稿失敗'))
      console.log(chalk.red('エラー詳細:'))
      console.log(result)
    }
    
  } catch (error) {
    console.error(chalk.red('❌ リクエストエラー:'), error.message)
  }
}

async function checkApiStatus() {
  console.log(chalk.blue('\n🔍 API状態確認\n'))
  
  const endpoints = [
    '/api/twitter/post',
    '/api/publish/post/now',
    '/api/create/flow/complete'
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET'
      })
      
      console.log(`${endpoint}: ${response.status} ${response.statusText}`)
    } catch (error) {
      console.log(`${endpoint}: ❌ 接続エラー`)
    }
  }
}

async function main() {
  console.log(chalk.yellow('Twitter API 直接テスト'))
  console.log(chalk.gray('======================\n'))
  
  await checkApiStatus()
  await testTwitterPost()
  
  console.log(chalk.blue('\n💡 ヒント:'))
  console.log('- NextAuthセッションが必要な場合は、ブラウザからログインしてください')
  console.log('- 環境変数が正しく設定されているか確認してください')
  console.log('- ポート3000でサーバーが起動していることを確認してください')
}

main().catch(console.error)