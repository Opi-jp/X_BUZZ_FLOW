/**
 * Phase 1 API デバッグテスト
 * APIエンドポイント経由でPhase 1の処理をテスト
 */

require('dotenv').config({ path: '.env.local' })

async function testPhase1API() {
  console.log('=== Phase 1 API デバッグテスト ===\n')
  
  // まず新しいセッションを作成
  console.log('1. 新しいセッションを作成...')
  
  const createResponse = await fetch('http://localhost:3000/api/viral/cot-session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expertise: 'AI',
      style: 'Educational',
      platform: 'Twitter'
    })
  })
  
  if (!createResponse.ok) {
    console.error('セッション作成失敗:', await createResponse.text())
    return
  }
  
  const { sessionId } = await createResponse.json()
  console.log('セッションID:', sessionId)
  
  // 少し待機（DB書き込みの完了を待つ）
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Phase 1を実行
  console.log('\n2. Phase 1を実行...')
  console.log('処理URL:', `http://localhost:3000/api/viral/cot-session/${sessionId}/process`)
  
  const processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST'
  })
  
  if (!processResponse.ok) {
    console.error('Phase 1実行失敗:', await processResponse.text())
    return
  }
  
  const phase1Result = await processResponse.json()
  console.log('\nPhase 1実行結果:')
  console.log('- 成功:', phase1Result.success)
  console.log('- フェーズ:', phase1Result.phase)
  console.log('- ステップ:', phase1Result.step)
  console.log('- 次のフェーズ:', phase1Result.nextPhase)
  console.log('- 次のステップ:', phase1Result.nextStep)
  console.log('- 現在のステータス:', phase1Result.currentStatus)
  console.log('- 次のステータス:', phase1Result.nextStatus)
  
  if (phase1Result.result) {
    console.log('\nThink結果:')
    console.log('- クエリ数:', phase1Result.result.queries?.length)
    console.log('- 最初のクエリ:', phase1Result.result.queries?.[0])
  }
  
  // Thinkが完了したら、Executeを実行
  if (phase1Result.nextStep === 'EXECUTE') {
    console.log('\n3. Phase 1 Executeを実行...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const executeResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    
    if (!executeResponse.ok) {
      console.error('Execute実行失敗:', await executeResponse.text())
      
      // セッションステータスを確認
      console.log('\n4. セッションステータスを確認...')
      const statusResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}`)
      if (statusResponse.ok) {
        const session = await statusResponse.json()
        console.log('セッションステータス:', session.status)
        console.log('エラー:', session.lastError)
        console.log('現在のフェーズ:', session.currentPhase)
        console.log('現在のステップ:', session.currentStep)
      }
      return
    }
    
    const executeResult = await executeResponse.json()
    console.log('\nExecute実行結果:')
    console.log('- 成功:', executeResult.success)
    console.log('- ステップ:', executeResult.step)
    console.log('- 次のステップ:', executeResult.nextStep)
    
    if (executeResult.result) {
      console.log('\nExecute結果:')
      console.log('- 検索結果数:', executeResult.result.searchResults?.length)
      console.log('- 検索方法:', executeResult.result.searchMethod)
    }
  }
}

// サーバーが起動していることを確認
console.log('サーバーが起動していることを確認してください (npm run dev)\n')

testPhase1API().catch(console.error)