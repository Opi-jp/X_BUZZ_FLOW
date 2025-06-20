#!/usr/bin/env node

/**
 * Create→Post→Twitter投稿までの完全フローテスト
 * 下書き作成後、実際にTwitterに投稿するまでをテスト
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// テスト用のテーマ
const TEST_THEME = 'AIエージェントの進化'
const TEST_PLATFORM = 'Twitter'
const TEST_STYLE = 'エンターテイメント'

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
    
    const response = await fetch(`${API_BASE}${path}`, options)
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`)
    }
    
    return data
  } catch (error) {
    console.error(`Request failed for ${path}:`, error.message)
    throw error
  }
}

async function runFlowToPost() {
  console.log('🚀 Create→Post→Twitter投稿 完全フローテスト開始\n')
  
  try {
    // 1. セッション作成
    console.log('📝 Step 1: セッション作成')
    const createResponse = await makeRequest('/api/flow', 'POST', {
      theme: TEST_THEME,
      platform: TEST_PLATFORM,
      style: TEST_STYLE
    })
    
    const sessionId = createResponse.id
    console.log(`✅ セッション作成完了: ${sessionId}\n`)
    
    // 2. 自動進行で下書き作成まで
    console.log('🔄 Step 2: 自動進行で下書き作成')
    
    let completed = false
    let stepCount = 0
    const maxSteps = 10
    let drafts = []
    
    while (!completed && stepCount < maxSteps) {
      stepCount++
      console.log(`\n⏳ 進行 ${stepCount}:`)
      
      const nextResponse = await makeRequest(
        `/api/flow/${sessionId}/next`,
        'POST',
        { autoProgress: true }
      )
      
      console.log(`   アクション: ${nextResponse.action}`)
      console.log(`   メッセージ: ${nextResponse.message}`)
      
      if (nextResponse.action === 'completed') {
        completed = true
        drafts = nextResponse.drafts || []
        console.log(`\n✅ 下書き作成完了！ ${drafts.length}件の下書き`)
      }
      
      await delay(10000) // API処理待ち（LLMレスポンスのため長めに）
    }
    
    if (!completed || drafts.length === 0) {
      throw new Error('下書き作成に失敗しました')
    }
    
    // 3. 最初の下書きを投稿
    console.log('\n📤 Step 3: Twitter投稿実行')
    const draftToPost = drafts[0]
    console.log(`\n投稿する下書き:`)
    console.log(`  タイトル: ${draftToPost.title}`)
    console.log(`  内容: ${draftToPost.content.substring(0, 100)}...`)
    console.log(`  ハッシュタグ: ${draftToPost.hashtags.join(', ')}`)
    
    // モックモードチェック
    const isMockMode = process.env.USE_MOCK_POSTING === 'true'
    console.log(`\n投稿モード: ${isMockMode ? 'モック' : '本番'}\n`)
    
    // 投稿実行
    const postResponse = await makeRequest('/api/post', 'POST', {
      text: draftToPost.content,
      draftId: draftToPost.id
    })
    
    console.log('\n🎉 投稿成功！')
    console.log(`  投稿ID: ${postResponse.id}`)
    console.log(`  投稿URL: ${postResponse.url}`)
    console.log(`  投稿時刻: ${postResponse.createdAt}`)
    
    // 4. 下書きステータス確認
    console.log('\n📊 Step 4: 投稿後の確認')
    const updatedDrafts = await makeRequest('/api/drafts')
    const postedDraft = updatedDrafts.find(d => d.id === draftToPost.id)
    
    if (postedDraft) {
      console.log(`\n下書きステータス:`)
      console.log(`  ステータス: ${postedDraft.status}`)
      console.log(`  Twitter ID: ${postedDraft.tweetId || 'なし'}`)
    }
    
    return {
      success: true,
      sessionId,
      draftId: draftToPost.id,
      postId: postResponse.id,
      postUrl: postResponse.url,
      totalSteps: stepCount
    }
    
  } catch (error) {
    console.error('\n❌ フローテスト失敗:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// テスト実行
console.log('環境変数チェック:')
console.log(`  TWITTER_API_KEY: ${process.env.TWITTER_API_KEY ? '✓' : '✗'}`)
console.log(`  TWITTER_API_SECRET: ${process.env.TWITTER_API_SECRET ? '✓' : '✗'}`)
console.log(`  TWITTER_ACCESS_TOKEN: ${process.env.TWITTER_ACCESS_TOKEN ? '✓' : '✗'}`)
console.log(`  TWITTER_ACCESS_SECRET: ${process.env.TWITTER_ACCESS_SECRET ? '✓' : '✗'}`)
console.log(`  USE_MOCK_POSTING: ${process.env.USE_MOCK_POSTING || 'false'}\n`)

runFlowToPost()
  .then(result => {
    console.log('\n📈 最終結果:', JSON.stringify(result, null, 2))
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('予期しないエラー:', error)
    process.exit(1)
  })