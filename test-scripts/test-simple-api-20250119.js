#!/usr/bin/env node

/**
 * シンプルなAPIテスト
 * Date: 2025-01-19
 */

const chalk = require('chalk')

async function testSessionCreate() {
  console.log(chalk.blue('📋 セッション作成テスト\n'))
  
  try {
    const response = await fetch('http://localhost:3000/api/generation/content/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: 'AIと創造性の未来',
        platform: 'Twitter',
        style: 'エンターテイメント'
      })
    })
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok && data.session) {
      console.log(chalk.green('\n✅ セッション作成成功！'))
      console.log(`Session ID: ${data.session.id}`)
      return data.session.id
    }
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error)
  }
  
  return null
}

async function testCollect(sessionId) {
  console.log(chalk.blue('\n🔍 トピック収集テスト\n'))
  
  try {
    const response = await fetch(`http://localhost:3000/api/generation/content/sessions/${sessionId}/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log(chalk.green('\n✅ 収集開始成功！'))
    }
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error)
  }
}

async function checkStatus(sessionId) {
  console.log(chalk.blue('\n📊 ステータス確認\n'))
  
  try {
    const response = await fetch(`http://localhost:3000/api/generation/content/sessions/${sessionId}`)
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    
    const data = await response.json()
    console.log('Session Status:', data.session?.status)
    
    if (data.session?.topics) {
      console.log('Topics Length:', data.session.topics.length)
      console.log('Topics Type:', typeof data.session.topics)
    }
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error)
  }
}

async function main() {
  console.log(chalk.yellow('🧪 シンプルAPIテスト'))
  console.log(chalk.gray('==================\n'))
  
  // Step 1: セッション作成
  const sessionId = await testSessionCreate()
  
  if (sessionId) {
    // Step 2: トピック収集
    await testCollect(sessionId)
    
    // Step 3: ステータス確認
    setTimeout(async () => {
      await checkStatus(sessionId)
    }, 3000)
  }
}

main().catch(console.error)