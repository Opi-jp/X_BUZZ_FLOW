#!/usr/bin/env node

/**
 * 適切な待機時間でのフローテスト
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeRequest(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body) options.body = JSON.stringify(body)
  
  const response = await fetch(`${API_BASE}${path}`, options)
  return response.json()
}

async function testWithProperTiming() {
  console.log('🚀 適切な待機時間でのフローテスト\n')
  
  try {
    // 1. セッション作成
    console.log('📝 セッション作成...')
    const session = await makeRequest('/api/flow', 'POST', {
      theme: 'AI時代の新しい働き方',
      platform: 'Twitter',
      style: 'エンターテイメント'
    })
    console.log(`✅ セッションID: ${session.id}\n`)
    
    const sessionId = session.id
    let completed = false
    let attempt = 0
    const maxAttempts = 20 // 最大20回試行
    
    while (!completed && attempt < maxAttempts) {
      attempt++
      
      // フロー進行
      const next = await makeRequest(`/api/flow/${sessionId}/next`, 'POST', {
        autoProgress: true
      })
      
      console.log(`[試行 ${attempt}] ${next.action}: ${next.message}`)
      
      if (next.action === 'completed') {
        completed = true
        console.log('\n🎉 フロー完了！')
        
        if (next.drafts && next.drafts.length > 0) {
          console.log(`\n📋 作成された下書き: ${next.drafts.length}件`)
          
          // 最初の下書きを投稿
          const draft = next.drafts[0]
          console.log(`\n📤 投稿テスト: ${draft.title}`)
          
          const text = `${draft.content}\n\n${(draft.hashtags || []).map(tag => `#${tag.replace(/^#/, '')}`).join(' ')}`
          
          const postResult = await makeRequest('/api/post', 'POST', {
            text,
            draftId: draft.id
          })
          
          console.log(`✅ 投稿成功: ${postResult.url}`)
        }
      } else {
        // 各フェーズに応じた適切な待機時間
        let waitTime = 5000 // デフォルト5秒
        
        if (next.action === 'collecting') {
          waitTime = 45000 // Perplexity: 45秒
          console.log('   ⏳ Perplexity処理中... (45秒待機)')
        } else if (next.action === 'generating_concepts') {
          waitTime = 30000 // GPT: 30秒
          console.log('   ⏳ GPTコンセプト生成中... (30秒待機)')
        } else if (next.action === 'generating_content') {
          waitTime = 20000 // Claude: 20秒
          console.log('   ⏳ Claude投稿生成中... (20秒待機)')
        }
        
        await delay(waitTime)
      }
    }
    
    if (!completed) {
      console.log('\n❌ タイムアウト: フローが完了しませんでした')
    }
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
  }
}

console.log(`モード: ${process.env.USE_MOCK_POSTING === 'true' ? 'モック' : '本番'}\n`)
testWithProperTiming()