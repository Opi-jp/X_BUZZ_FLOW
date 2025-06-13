#!/usr/bin/env node

/**
 * 認証デバッグスクリプト
 * NextAuthの設定を確認
 */

require('dotenv').config({ path: '.env.local' })

console.log('=== NextAuth 設定確認 ===\n')

// 環境変数チェック
const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET'
]

const envVars = {}
let allSet = true

requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`❌ ${varName}: 未設定`)
    allSet = false
  } else {
    if (varName.includes('SECRET') || varName.includes('CLIENT_ID')) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`✅ ${varName}: ${value}`)
    }
  }
  envVars[varName] = value
})

console.log('\n' + '─'.repeat(50) + '\n')

if (!allSet) {
  console.log('⚠️ 必要な環境変数が設定されていません')
  console.log('\n.env.localファイルに以下を設定してください:')
  console.log(`
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
`)
} else {
  console.log('✅ すべての環境変数が設定されています')
  
  // Twitter OAuth設定の確認
  console.log('\n📱 Twitter App設定の確認事項:')
  console.log('1. Callback URL: http://localhost:3000/api/auth/callback/twitter')
  console.log('2. OAuth 2.0が有効になっている')
  console.log('3. 必要なスコープ: tweet.read, tweet.write, users.read, offline.access')
  
  console.log('\n🔧 デバッグ方法:')
  console.log('1. npm run dev でサーバー起動')
  console.log('2. http://localhost:3000/api/auth/debug にアクセス')
  console.log('3. コンソールログを確認')
  
  console.log('\n📝 テスト用URL:')
  console.log('- サインイン: http://localhost:3000/auth/signin')
  console.log('- API確認: http://localhost:3000/api/auth/providers')
  console.log('- セッション: http://localhost:3000/api/auth/session')
}

// Twitter OAuth URLの生成
if (envVars.TWITTER_CLIENT_ID) {
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${envVars.TWITTER_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/callback/twitter')}&` +
    `scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}&` +
    `state=test&` +
    `code_challenge=test&` +
    `code_challenge_method=plain`
  
  console.log('\n🔗 手動認証テストURL:')
  console.log(authUrl)
}