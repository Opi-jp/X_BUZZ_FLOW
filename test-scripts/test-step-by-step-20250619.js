#!/usr/bin/env node

/**
 * ステップバイステップで実行して問題を特定
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function makeRequest(path, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    console.log(`\n📡 リクエスト: ${method} ${path}`)
    if (body) console.log('Body:', JSON.stringify(body, null, 2))
    
    const response = await fetch(`${API_BASE}${path}`, options)
    const data = await response.json()
    
    console.log(`📥 レスポンス: ${response.status}`)
    console.log(JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`)
    }
    
    return data
  } catch (error) {
    console.error(`❌ エラー:`, error.message)
    throw error
  }
}

async function stepByStepTest() {
  console.log('🚀 ステップバイステップテスト開始\n')
  
  try {
    // 1. セッション作成
    console.log('=== Step 1: セッション作成 ===')
    const createResponse = await makeRequest('/api/flow', 'POST', {
      theme: 'AIの民主化と未来',
      platform: 'Twitter',
      style: 'エンターテイメント'
    })
    
    const sessionId = createResponse.id
    console.log(`\n✅ セッションID: ${sessionId}`)
    
    // 2. Perplexity収集を手動実行
    console.log('\n=== Step 2: Perplexity収集（手動） ===')
    await makeRequest(
      `/api/generation/content/sessions/${sessionId}/collect`,
      'POST'
    )
    
    // 3. 少し待ってからステータス確認
    console.log('\n⏳ 5秒待機...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n=== Step 3: ステータス確認 ===')
    const status1 = await makeRequest(`/api/flow/${sessionId}`)
    console.log(`現在のステータス: ${status1.status}`)
    
    // 4. コンセプト生成を手動実行
    console.log('\n=== Step 4: コンセプト生成（手動） ===')
    await makeRequest(
      `/api/generation/content/sessions/${sessionId}/generate-concepts`,
      'POST'
    )
    
    // 5. 結果確認
    console.log('\n⏳ 5秒待機...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n=== Step 5: 最終ステータス確認 ===')
    const finalStatus = await makeRequest(`/api/flow/${sessionId}`)
    console.log(`最終ステータス: ${finalStatus.status}`)
    console.log(`concepts: ${finalStatus.concepts ? 'あり' : 'なし'}`)
    
  } catch (error) {
    console.error('\n💥 テスト失敗:', error.message)
  }
}

stepByStepTest()