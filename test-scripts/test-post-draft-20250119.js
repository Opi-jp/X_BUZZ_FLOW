#\!/usr/bin/env node
/**
 * 下書きから投稿実行テスト
 */

const baseUrl = 'http://localhost:3000'

async function testPostDraft() {
  console.log('🚀 下書きから投稿実行テスト')
  console.log('='.repeat(50))
  
  try {
    // 1. 最新の下書きを取得
    console.log('\n1️⃣ 下書き取得...')
    const draftsRes = await fetch(`${baseUrl}/api/drafts`)
    const draftsData = await draftsRes.json()
    
    if (\!draftsData.drafts || draftsData.drafts.length === 0) {
      console.log('❌ 下書きが見つかりません')
      return
    }
    
    // DRAFT状態の最初の下書きを選択
    const draft = draftsData.drafts.find(d => d.status === 'DRAFT')
    if (\!draft) {
      console.log('❌ 投稿可能な下書きが見つかりません')
      return
    }
    
    console.log(`✅ 下書き選択: ${draft.title}`)
    console.log(`内容: ${draft.content.substring(0, 100)}...`)
    console.log(`ハッシュタグ: ${draft.hashtags.join(' ')}`)
    
    // 2. 投稿実行
    console.log('\n2️⃣ Twitter投稿実行...')
    const postRes = await fetch(`${baseUrl}/api/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: draft.content,
        hashtags: draft.hashtags,
        draftId: draft.id
      })
    })
    
    if (postRes.ok) {
      const postResult = await postRes.json()
      console.log('\n✅ 投稿成功！')
      console.log(`📱 Twitter URL: ${postResult.url || postResult.tweetUrl || '(モックモード)'}`)
      console.log(`Tweet ID: ${postResult.id || postResult.tweetId || 'N/A'}`)
      
      // 3. 下書きのステータス確認
      console.log('\n3️⃣ 下書きステータス確認...')
      const updatedDraftsRes = await fetch(`${baseUrl}/api/drafts`)
      const updatedDraftsData = await updatedDraftsRes.json()
      const updatedDraft = updatedDraftsData.drafts.find(d => d.id === draft.id)
      
      if (updatedDraft) {
        console.log(`下書きステータス: ${updatedDraft.status}`)
        console.log(`Tweet ID: ${updatedDraft.tweetId || 'なし'}`)
      }
    } else {
      console.log(`\n❌ 投稿失敗: ${postRes.status}`)
      const errorText = await postRes.text()
      console.log('エラー:', errorText.substring(0, 200))
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

// 環境変数の確認
console.log('📋 環境変数チェック:')
console.log(`USE_MOCK_POSTING: ${process.env.USE_MOCK_POSTING || '未設定'}`)
console.log(`TWITTER_CLIENT_ID: ${process.env.TWITTER_CLIENT_ID ? '設定済み' : '未設定'}`)
console.log(`TWITTER_CLIENT_SECRET: ${process.env.TWITTER_CLIENT_SECRET ? '設定済み' : '未設定'}`)

testPostDraft()
EOF < /dev/null