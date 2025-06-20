#!/usr/bin/env node
/**
 * API削除後の基本フロー動作確認
 */

const baseUrl = 'http://localhost:3000'

async function testSimpleFlow() {
  console.log('🔧 削除後のシンプルフロー動作確認')
  console.log('='.repeat(50))
  
  try {
    // 1. 新規フロー作成
    console.log('\n1️⃣ 新規フロー作成テスト...')
    const createResponse = await fetch(`${baseUrl}/api/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'API削除後テスト',
        platform: 'Twitter',
        style: 'エンターテイメント'
      })
    })
    
    if (!createResponse.ok) {
      throw new Error(`フロー作成失敗: ${createResponse.status}`)
    }
    
    const session = await createResponse.json()
    console.log(`✅ フロー作成成功: ${session.id}`)
    
    // 2. フロー進行テスト
    console.log('\n2️⃣ 次ステップ実行テスト...')
    const nextResponse = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    if (!nextResponse.ok) {
      console.log(`⚠️ 次ステップ失敗: ${nextResponse.status}`)
      const errorText = await nextResponse.text()
      console.log('Error:', errorText.substring(0, 200))
    } else {
      const result = await nextResponse.json()
      console.log(`✅ 次ステップ成功: ${result.action}`)
      console.log(`📝 メッセージ: ${result.message}`)
    }
    
    // 3. フロー状態確認
    console.log('\n3️⃣ フロー状態確認...')
    const statusResponse = await fetch(`${baseUrl}/api/flow/${session.id}`)
    
    if (!statusResponse.ok) {
      throw new Error(`状態確認失敗: ${statusResponse.status}`)
    }
    
    const status = await statusResponse.json()
    console.log(`✅ 現在のステータス: ${status.status}`)
    console.log(`📊 topics: ${status.topics ? '有' : '無'}`)
    console.log(`📊 concepts: ${status.concepts ? '有' : '無'}`)
    
    // 4. 下書き一覧確認
    console.log('\n4️⃣ 下書きAPI確認...')
    const draftsResponse = await fetch(`${baseUrl}/api/drafts`)
    
    if (!draftsResponse.ok) {
      throw new Error(`下書き確認失敗: ${draftsResponse.status}`)
    }
    
    const drafts = await draftsResponse.json()
    console.log(`✅ 下書き取得成功: ${drafts.drafts?.length || 0}件`)
    
    console.log('\n🎯 テスト結果:')
    console.log('- ✅ フロー作成 API動作中')
    console.log('- ⚠️ 次ステップ（要APIエンドポイント確認）')
    console.log('- ✅ フロー状態確認 API動作中')
    console.log('- ✅ 下書き一覧 API動作中')
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message)
  }
}

testSimpleFlow()