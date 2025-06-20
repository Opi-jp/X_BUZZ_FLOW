#!/usr/bin/env node

/**
 * コンセプト生成APIを直接テスト
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function testGenerateConcepts(sessionId) {
  try {
    console.log(`\n🎯 コンセプト生成APIテスト: ${sessionId}`)
    
    const response = await fetch(
      `${API_BASE}/api/generation/content/sessions/${sessionId}/generate-concepts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    
    const data = await response.json()
    
    console.log(`\nステータス: ${response.status}`)
    console.log('レスポンス:', JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      console.error('\n❌ エラー発生')
    } else {
      console.log('\n✅ 成功')
    }
    
  } catch (error) {
    console.error('\n💥 例外エラー:', error.message)
  }
}

const sessionId = process.argv[2] || 'cmc403mbp000l1yai0d5oi1os'
testGenerateConcepts(sessionId)