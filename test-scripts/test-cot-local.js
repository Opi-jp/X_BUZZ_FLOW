#!/usr/bin/env node

/**
 * ローカル環境でChain of Thoughtシステムをテストするスクリプト
 * 
 * 使い方:
 * node test-cot-local.js
 */

// 環境変数を読み込む
require('dotenv').config({ path: '.env.local' })

const API_BASE = 'http://localhost:3000/api'

// テスト用の設定
const testConfig = {
  expertise: 'AI × 働き方',
  style: '教育的',
  platform: 'Twitter'
}

async function testCreateSession() {
  console.log('🚀 1. セッション作成テスト')
  console.log('設定:', testConfig)
  
  try {
    const response = await fetch(`${API_BASE}/viral/cot-session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testConfig)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ セッション作成成功!')
    console.log('セッションID:', data.sessionId)
    console.log('レスポンス:', JSON.stringify(data, null, 2))
    
    return data.sessionId
  } catch (error) {
    console.error('❌ セッション作成エラー:', error)
    return null
  }
}

async function testProcessSession(sessionId) {
  console.log('\n🔄 2. セッション処理テスト')
  console.log('セッションID:', sessionId)
  
  try {
    const response = await fetch(`${API_BASE}/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorData}`)
    }
    
    const data = await response.json()
    console.log('✅ 処理成功!')
    console.log('フェーズ:', data.phase)
    console.log('ステップ:', data.step)
    console.log('所要時間:', data.duration + 'ms')
    
    if (data.result) {
      console.log('\n📊 結果の概要:')
      if (data.phase === 1 && data.step === 'THINK') {
        console.log('生成されたクエリ数:', data.result.queries?.length || 0)
        if (data.result.queries) {
          console.log('サンプルクエリ:')
          data.result.queries.slice(0, 3).forEach((q, i) => {
            console.log(`  ${i + 1}. ${q.query} (${q.category})`)
          })
        }
      }
    }
    
    return data
  } catch (error) {
    console.error('❌ 処理エラー:', error)
    return null
  }
}

async function testGoogleSearch() {
  console.log('\n🔍 3. Google検索APIテスト（直接）')
  
  const testQueries = [
    'AI agent workplace automation latest',
    'AI skills wage gap 2025',
    'AI 働き方 最新 2025'
  ]
  
  // Google Search APIを直接テスト
  try {
    const { GoogleSearchClient } = require('./lib/google-search')
    const searchClient = new GoogleSearchClient()
    
    for (const query of testQueries) {
      console.log(`\n検索: "${query}"`)
      try {
        const results = await searchClient.search(query, { num: 3 })
        console.log(`結果数: ${results.length}`)
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.title}`)
          console.log(`     ${r.link}`)
        })
      } catch (error) {
        console.error('検索エラー:', error.message)
      }
    }
  } catch (moduleError) {
    console.error('モジュール読み込みエラー:', moduleError.message)
  }
}

async function main() {
  console.log('=== Chain of Thought ローカルテスト ===\n')
  
  // 環境変数チェック
  console.log('📋 環境変数チェック:')
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ 設定済み' : '❌ 未設定')
  console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅ 設定済み' : '❌ 未設定')
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ 設定済み' : '❌ 未設定')
  console.log()
  
  // 1. セッション作成
  const sessionId = await testCreateSession()
  if (!sessionId) {
    console.log('\n⚠️  セッション作成に失敗しました。DBの接続を確認してください。')
    return
  }
  
  // 2. セッション処理（Phase 1 - Think）
  console.log('\n⏳ 3秒待機中...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const result = await testProcessSession(sessionId)
  if (!result) {
    console.log('\n⚠️  処理に失敗しました。')
    return
  }
  
  // 3. Google検索の直接テスト
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    await testGoogleSearch()
  }
  
  console.log('\n✅ テスト完了!')
  console.log('\n💡 次のステップ:')
  console.log('1. セッションIDを使って引き続き処理を実行できます')
  console.log(`2. curl -X POST http://localhost:3000/api/viral/cot-session/${sessionId}/process`)
  console.log('3. ブラウザで http://localhost:3000/viral/cot にアクセスしてUIから操作')
}

// 開発サーバーが起動しているかチェック
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health')
    return response.ok
  } catch {
    return false
  }
}

// 実行
console.log('🔌 開発サーバーの確認中...')
checkServer().then(isRunning => {
  if (!isRunning) {
    console.log('❌ 開発サーバーが起動していません。')
    console.log('👉 別のターミナルで `npm run dev` を実行してください。')
    process.exit(1)
  }
  
  console.log('✅ 開発サーバーが起動しています。\n')
  main().catch(console.error)
})