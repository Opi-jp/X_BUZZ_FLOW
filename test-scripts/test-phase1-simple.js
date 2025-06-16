/**
 * Phase 1シンプルテスト - エラーを直接確認
 */

require('dotenv').config({ path: '.env.local' })

async function simpleTest() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    // セッション作成
    const createRes = await fetch(`${baseUrl}/api/viral/cot-session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expertise: 'AI',
        style: '教育的',
        platform: 'Twitter'
      })
    })
    
    if (!createRes.ok) {
      console.error('セッション作成失敗:', await createRes.text())
      return
    }
    
    const { sessionId } = await createRes.json()
    console.log(`セッションID: ${sessionId}`)
    
    // 各フェーズを実行
    for (let i = 0; i < 3; i++) {
      console.log(`\n実行 ${i+1}/3:`)
      
      const res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST'
      })
      
      if (!res.ok) {
        console.error('API呼び出し失敗:', res.status)
        const errorText = await res.text()
        console.error('エラー内容:', errorText)
        break
      }
      
      const result = await res.json()
      console.log('成功:', result.success)
      console.log('ステップ:', result.step)
      console.log('メッセージ:', result.message)
      
      if (result.error) {
        console.error('エラー:', result.error)
        console.error('詳細:', result.details)
      }
      
      // 処理中の場合は少し待つ
      if (result.message === '処理中です') {
        console.log('処理中なので10秒待機...')
        await new Promise(r => setTimeout(r, 10000))
      } else {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    
  } catch (error) {
    console.error('予期しないエラー:', error)
  }
}

simpleTest()