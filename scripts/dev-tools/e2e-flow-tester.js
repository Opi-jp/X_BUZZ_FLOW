#!/usr/bin/env node

/**
 * Create→Post完全フローE2Eテスト
 * autoProgress機能を使用して、自動的に全フェーズを進行
 */

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// コマンドライン引数からテーマを取得
const args = process.argv.slice(2)
let TEST_THEME = 'AIと働き方の未来'
let AUTO_PROGRESS = false

// 引数をパース
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--theme' && args[i + 1]) {
    TEST_THEME = args[i + 1]
    i++
  } else if (args[i] === '--auto-progress') {
    AUTO_PROGRESS = true
  }
}

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

async function runE2ETest() {
  console.log('🚀 Create→Post E2Eテスト開始\n')
  
  try {
    // 1. セッション作成
    console.log('📝 Step 1: セッション作成')
    const createResponse = await makeRequest('/api/create/flow/start', 'POST', {
      theme: TEST_THEME,
      platform: TEST_PLATFORM,
      style: TEST_STYLE
    })
    
    const sessionId = createResponse.id
    console.log(`✅ セッション作成完了: ${sessionId}`)
    console.log(`   テーマ: ${TEST_THEME}`)
    console.log(`   プラットフォーム: ${TEST_PLATFORM}`)
    console.log(`   スタイル: ${TEST_STYLE}\n`)
    
    // 2. 自動進行でフロー実行
    console.log('🔄 Step 2: 自動進行開始（autoProgress=true）')
    
    let currentStatus = 'CREATED'
    let stepCount = 0
    const maxSteps = 10 // 無限ループ防止
    
    while (currentStatus !== 'COMPLETED' && stepCount < maxSteps) {
      stepCount++
      console.log(`\n⏳ 進行 ${stepCount}: 現在のステータス = ${currentStatus}`)
      
      // 次のステップへ進む
      const nextResponse = await makeRequest(
        `/api/create/flow/${sessionId}/process`,
        'POST',
        { autoProgress: AUTO_PROGRESS }
      )
      
      console.log(`   アクション: ${nextResponse.action}`)
      console.log(`   メッセージ: ${nextResponse.message}`)
      
      // ステータス確認
      await delay(2000) // API処理待ち
      
      const statusResponse = await makeRequest(`/api/create/flow/${sessionId}/status`)
      currentStatus = nextResponse.status || statusResponse.currentStep || currentStatus
      
      // 各フェーズの結果を表示
      if (statusResponse.data?.topics && !statusResponse.data?.concepts) {
        const topicsLength = typeof statusResponse.data.topics === 'string' 
          ? statusResponse.data.topics.length 
          : JSON.stringify(statusResponse.data.topics).length
        console.log(`   ✅ トピック収集完了（${topicsLength}文字）`)
      } else if (statusResponse.data?.concepts && !statusResponse.data?.contents) {
        const conceptCount = statusResponse.data.concepts.length
        console.log(`   ✅ コンセプト生成完了（${conceptCount}個）`)
        if (statusResponse.data?.selectedConcepts) {
          console.log(`   ✅ コンセプト選択完了（${statusResponse.data.selectedConcepts.length}個選択）`)
        }
      } else if (statusResponse.data?.contents) {
        console.log(`   ✅ コンテンツ生成完了`)
      }
      
      // 完了チェック
      if (nextResponse.action === 'completed' || currentStatus === 'COMPLETED') {
        currentStatus = 'COMPLETED'
        console.log('\n🎉 全フェーズ完了！')
        
        if (nextResponse.drafts) {
          console.log(`\n📋 作成された下書き: ${nextResponse.drafts.length}件`)
          nextResponse.drafts.forEach((draft, index) => {
            console.log(`\n下書き ${index + 1}:`)
            console.log(`  タイトル: ${draft.title || 'タイトルなし'}`)
            console.log(`  内容: ${draft.content ? (typeof draft.content === 'string' ? draft.content.substring(0, 100) : JSON.stringify(draft.content).substring(0, 100)) + '...' : '内容なし'}`)
            console.log(`  ハッシュタグ: ${draft.hashtags ? draft.hashtags.join(', ') : 'なし'}`)
          })
        }
      }
    }
    
    if (stepCount >= maxSteps) {
      throw new Error('最大ステップ数に到達しました。無限ループの可能性があります。')
    }
    
    // 3. 最終確認
    console.log('\n📊 最終結果確認')
    const finalSession = await makeRequest(`/api/create/flow/${sessionId}/status`)
    
    console.log(`\n✅ E2Eテスト成功！`)
    console.log(`   総ステップ数: ${stepCount}`)
    console.log(`   最終ステータス: ${finalSession.status}`)
    console.log(`   トピック: ${finalSession.topics ? '✓' : '✗'}`)
    console.log(`   コンセプト: ${finalSession.concepts ? '✓' : '✗'}`)
    console.log(`   コンテンツ: ${finalSession.contents ? '✓' : '✗'}`)
    
    // 4. 下書き確認
    const draftsResponse = await makeRequest('/api/create/draft/list')
    const drafts = Array.isArray(draftsResponse) ? draftsResponse : draftsResponse.drafts || []
    const sessionDrafts = drafts.filter(d => d.sessionId === sessionId)
    console.log(`   下書き数: ${sessionDrafts.length}`)
    
    // 5. 投稿テスト（オプション）
    if (process.env.TEST_POSTING === 'true' && sessionDrafts.length > 0) {
      console.log('\n📤 投稿テスト開始')
      const draftToPost = sessionDrafts[0]
      console.log(`投稿する下書き: ${draftToPost.title}`)
      
      const postResponse = await makeRequest('/api/publish/post/now', 'POST', {
        content: draftToPost.content,
        hashtags: draftToPost.hashtags,
        draftId: draftToPost.id
      })
      
      console.log(`✅ 投稿成功: ${postResponse.url}`)
    }
    
    return {
      success: true,
      sessionId,
      steps: stepCount,
      draftsCreated: sessionDrafts.length
    }
    
  } catch (error) {
    console.error('\n❌ E2Eテスト失敗:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// テスト実行
runE2ETest()
  .then(result => {
    console.log('\n📈 テスト結果:', JSON.stringify(result, null, 2))
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('予期しないエラー:', error)
    process.exit(1)
  })