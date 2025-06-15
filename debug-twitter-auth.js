#!/usr/bin/env node

// Twitter OAuth 2.0 設定デバッグスクリプト

const CLIENT_ID = 'd09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ'
const CLIENT_SECRET = 'CKJQmYy5oqPNjOTm0NkltPcHxRA-fCaSVrtoVVcIO9VlTsS0Nn'
const CALLBACK_URL = 'https://x-buzz-flow.vercel.app/api/auth/callback/twitter'

console.log('🔍 Twitter OAuth 2.0 設定デバッグ')
console.log('====================================')

console.log('\n📋 現在の設定:')
console.log(`Client ID: ${CLIENT_ID}`)
console.log(`Client Secret: ${CLIENT_SECRET.substring(0, 10)}...`)
console.log(`Callback URL: ${CALLBACK_URL}`)

console.log('\n🚨 確認が必要な項目:')
console.log('1. Twitter Developer Portal設定')
console.log('   https://developer.twitter.com/en/portal/dashboard')
console.log('')
console.log('2. OAuth 2.0 Settings確認')
console.log('   ✅ Type: Web App, Automated App or Bot')
console.log('   ✅ Callback URLs: ' + CALLBACK_URL)
console.log('   ✅ Website URL: https://x-buzz-flow.vercel.app')
console.log('')
console.log('3. App permissions確認')
console.log('   ✅ Read and Write permissions')
console.log('   ✅ Tweet and Retweet')
console.log('   ✅ Like and Unlike') 
console.log('   ✅ Read your account information')
console.log('')
console.log('4. User authentication settings')
console.log('   ✅ OAuth 2.0: Enable')
console.log('   ✅ OAuth 1.0a: Disable')
console.log('   ✅ Request email from users: Enable')

console.log('\n🔧 修正手順:')
console.log('1. Twitter Developer Portalで設定確認')
console.log('2. 必要に応じてClient ID/Secretを再生成')
console.log('3. Vercel環境変数を更新')
console.log('4. 認証テストを実行')

console.log('\n🧪 テスト用URL:')
console.log('サインインページ: https://x-buzz-flow.vercel.app/auth/signin')
console.log('Twitter認証: https://x-buzz-flow.vercel.app/api/auth/signin/twitter')
console.log('プロバイダー確認: https://x-buzz-flow.vercel.app/api/auth/providers')

console.log('\n✨ 成功時の期待動作:')
console.log('1. Twitter認証ページにリダイレクト')
console.log('2. 認証許可後、コールバックURL呼び出し')
console.log('3. ダッシュボード(https://x-buzz-flow.vercel.app/dashboard)にリダイレクト')
console.log('4. セッション情報保存、ユーザー情報表示')