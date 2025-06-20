#!/usr/bin/env node

/**
 * 既存の下書きから直接投稿テスト
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function directPost() {
  try {
    // 1. 既存の下書きを取得
    const response = await fetch(`${API_BASE}/api/drafts`)
    const drafts = await response.json()
    
    if (!drafts || drafts.length === 0) {
      console.log('下書きがありません')
      return
    }
    
    // 最新の下書きを選択
    const draft = drafts[0]
    console.log(`\n📝 投稿する下書き:`)
    console.log(`タイトル: ${draft.title}`)
    console.log(`内容: ${draft.content.substring(0, 100)}...`)
    
    // 2. 投稿実行
    const postResponse = await fetch(`${API_BASE}/api/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: draft.content,
        hashtags: draft.hashtags,
        draftId: draft.id
      })
    })
    
    const result = await postResponse.json()
    
    if (postResponse.ok) {
      console.log(`\n✅ 投稿成功！`)
      console.log(`URL: ${result.url}`)
    } else {
      console.log(`\n❌ 投稿失敗:`, result.error)
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

console.log(`モード: ${process.env.USE_MOCK_POSTING === 'true' ? 'モック' : '本番'}`);
directPost()