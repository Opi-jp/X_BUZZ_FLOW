/**
 * Phase 1のみの動作確認テスト
 */

require('dotenv').config({ path: '.env.local' })

async function testPhase1Only() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    // セッション作成
    console.log('1. セッション作成')
    const createRes = await fetch(`${baseUrl}/api/viral/cot-session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expertise: 'AI',
        style: '教育的',
        platform: 'Twitter'
      })
    })
    
    const { sessionId } = await createRes.json()
    console.log(`   セッションID: ${sessionId}\n`)
    
    // Phase 1-1: Think
    console.log('2. Phase 1-1: Think')
    let res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    let result = await res.json()
    
    if (result.result?.queries) {
      console.log(`   生成されたクエリ数: ${result.result.queries.length}`)
      result.result.queries.forEach((q, i) => {
        console.log(`   ${i+1}. ${q.topic} (${q.category})`)
      })
    }
    
    await new Promise(r => setTimeout(r, 2000))
    
    // Phase 1-2: Execute
    console.log('\n3. Phase 1-2: Execute')
    res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    result = await res.json()
    console.log(`   実行完了`)
    
    await new Promise(r => setTimeout(r, 2000))
    
    // Phase 1-3: Integrate
    console.log('\n4. Phase 1-3: Integrate')
    res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    result = await res.json()
    console.log(`   ステータス: ${result.success ? '成功' : '失敗'}`)
    console.log(`   フェーズ完了: ${result.phaseCompleted}`)
    console.log(`   メッセージ: ${result.message}`)
    
    if (result.result) {
      console.log(`   特定されたトピック数: ${result.result.topicCount}`)
      if (result.result.trendedTopics) {
        result.result.trendedTopics.forEach((topic, i) => {
          console.log(`\n   トピック${i+1}: ${topic.topicName}`)
          console.log(`   カテゴリ: ${topic.category}`)
          console.log(`   バイラル要素:`)
          Object.entries(topic.viralElements).forEach(([k, v]) => {
            console.log(`     ${k}: ${v}`)
          })
        })
      }
      
      console.log(`\n   nextStepMessage: ${result.result.nextStepMessage}`)
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

testPhase1Only()