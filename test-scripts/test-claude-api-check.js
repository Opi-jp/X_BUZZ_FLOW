#!/usr/bin/env node

/**
 * Claude API接続テスト
 */

require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

async function testClaudeAPI() {
  console.log('=== Claude API 接続テスト ===\n')
  
  // APIキーの存在確認
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    console.error('❌ CLAUDE_API_KEY が設定されていません')
    return
  }
  
  console.log('✅ APIキーが設定されています')
  console.log(`キーの最初の10文字: ${apiKey.substring(0, 10)}...`)
  
  const anthropic = new Anthropic({
    apiKey: apiKey,
  })
  
  console.log('\n🔍 シンプルなメッセージをテスト中...')
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: 'こんにちは。これはテストメッセージです。'
        }
      ]
    })
    
    console.log('\n✅ API接続成功！')
    console.log('レスポンス:', message.content[0].text)
    
  } catch (error) {
    console.error('\n❌ APIエラー:')
    console.error('エラータイプ:', error.status || 'unknown')
    console.error('エラーメッセージ:', error.message)
    
    if (error.status === 400) {
      console.error('\n💡 考えられる原因:')
      console.error('1. APIキーが無効または期限切れ')
      console.error('2. クレジット残高不足')
      console.error('3. APIキーの権限不足')
      console.error('\nhttps://console.anthropic.com でAPIキーとクレジット残高を確認してください')
    }
  }
}

// 実行
testClaudeAPI()