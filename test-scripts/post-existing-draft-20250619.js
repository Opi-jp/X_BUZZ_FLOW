#!/usr/bin/env node

/**
 * 既存の下書きを投稿するテスト
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function postExistingDraft() {
  try {
    // 1. 最新の下書きを取得
    const draftsResponse = await fetch(`${API_BASE}/api/drafts`)
    const data = await draftsResponse.json()
    
    // レスポンス形式の確認
    const drafts = Array.isArray(data) ? data : (data.drafts || [])
    
    if (!drafts || drafts.length === 0) {
      console.log('❌ 下書きがありません')
      return
    }
    
    // DRAFT状態の最初の下書きを選択
    const draft = drafts.find(d => d.status === 'DRAFT') || drafts[0]
    
    console.log('📝 投稿する下書き:')
    console.log(`  ID: ${draft.id}`)
    console.log(`  タイトル: ${draft.title}`)
    console.log(`  内容: ${draft.content.substring(0, 100)}...`)
    console.log(`  ステータス: ${draft.status}`)
    
    // 2. 投稿実行
    const hashtags = draft.hashtags || []
    const text = `${draft.content}\n\n${hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')}`
    
    console.log('\n📤 投稿実行...')
    const response = await fetch(`${API_BASE}/api/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, draftId: draft.id })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('\n✅ 投稿成功！')
      console.log(`  ID: ${result.id}`)
      console.log(`  URL: ${result.url}`)
      console.log(`  モック: ${result.mock ? 'はい' : 'いいえ'}`)
    } else {
      console.log('\n❌ 投稿失敗:', result.error)
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

console.log(`モード: ${process.env.USE_MOCK_POSTING === 'true' ? 'モック' : '本番'}\n`);
postExistingDraft()