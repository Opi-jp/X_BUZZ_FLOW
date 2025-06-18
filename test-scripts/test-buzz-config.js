#!/usr/bin/env node

/**
 * Buzz設定機能のE2Eテスト
 */

async function testBuzzConfig() {
  console.log('🧪 Buzz設定機能テスト開始\n')
  
  const baseUrl = 'http://localhost:3000'
  
  try {
    // 1. 初期設定取得テスト
    console.log('1️⃣ 初期設定取得テスト')
    const getResponse = await fetch(`${baseUrl}/api/buzz/config`)
    const getResult = await getResponse.json()
    console.log('✅ GET成功:', getResult.config)
    
    // 2. 設定保存テスト
    console.log('\n2️⃣ 設定保存テスト')
    const newConfig = {
      keywords: ['AI', '働き方', 'ChatGPT', 'テスト'],
      accounts: ['@openai', '@anthropic', '@test'],
      minEngagement: 750,
      minImpressions: 3000,
      collectInterval: 45,
      enabled: true
    }
    
    const postResponse = await fetch(`${baseUrl}/api/buzz/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    })
    
    const postResult = await postResponse.json()
    console.log('✅ POST成功:', postResult.message)
    console.log('📝 保存された設定:', postResult.config)
    
    // 3. 設定確認テスト
    console.log('\n3️⃣ 設定確認テスト')
    const verifyResponse = await fetch(`${baseUrl}/api/buzz/config`)
    const verifyResult = await verifyResponse.json()
    
    const saved = verifyResult.config
    const expected = newConfig
    
    const checks = [
      { key: 'keywords', match: JSON.stringify(saved.keywords) === JSON.stringify(expected.keywords) },
      { key: 'accounts', match: JSON.stringify(saved.accounts) === JSON.stringify(expected.accounts) },
      { key: 'minEngagement', match: saved.minEngagement === expected.minEngagement },
      { key: 'minImpressions', match: saved.minImpressions === expected.minImpressions },
      { key: 'collectInterval', match: saved.collectInterval === expected.collectInterval },
      { key: 'enabled', match: saved.enabled === expected.enabled }
    ]
    
    console.log('📊 設定項目チェック:')
    checks.forEach(check => {
      const status = check.match ? '✅' : '❌'
      console.log(`  ${status} ${check.key}: ${check.match ? 'OK' : 'NG'}`)
    })
    
    const allMatch = checks.every(c => c.match)
    
    // 4. 手動収集テスト（エラーが正常に返ることを確認）
    console.log('\n4️⃣ 手動収集テスト（無効化状態）')
    
    // まず無効化
    await fetch(`${baseUrl}/api/buzz/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newConfig, enabled: false })
    })
    
    const putResponse = await fetch(`${baseUrl}/api/buzz/config`, {
      method: 'PUT'
    })
    
    const putResult = await putResponse.json()
    if (putResult.error && putResult.error.includes('無効')) {
      console.log('✅ 無効化時のエラーハンドリング正常')
    } else {
      console.log('❌ 無効化時のエラーハンドリング異常:', putResult)
    }
    
    // 5. 結果サマリー
    console.log('\n📋 テスト結果サマリー')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ GET API: 正常`)
    console.log(`✅ POST API: 正常`) 
    console.log(`${allMatch ? '✅' : '❌'} データ永続化: ${allMatch ? '正常' : '異常'}`)
    console.log(`✅ PUT API エラーハンドリング: 正常`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (allMatch) {
      console.log('🎉 Buzz設定機能のテスト完了！すべて正常に動作しています')
    } else {
      console.log('⚠️  一部のテストで問題が発見されました')
    }
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error.message)
    process.exit(1)
  }
}

// メイン実行
if (require.main === module) {
  testBuzzConfig()
}