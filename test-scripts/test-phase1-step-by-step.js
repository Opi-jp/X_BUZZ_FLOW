/**
 * Phase 1 ステップバイステップテスト
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('./app/generated/prisma')
const prisma = new PrismaClient()

async function testStepByStep() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    // セッション作成
    console.log('=== セッション作成 ===')
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
    console.log(`セッションID: ${sessionId}`)
    
    // Phase 1-1: Think実行
    console.log('\n=== Phase 1-1: Think ===')
    const think1Res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    const think1Result = await think1Res.json()
    console.log('成功:', think1Result.success)
    
    // DB状態を確認
    const phase1AfterThink = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      }
    })
    
    console.log('\nThink結果:')
    if (phase1AfterThink?.thinkResult) {
      const thinkResult = phase1AfterThink.thinkResult
      console.log('  queries数:', thinkResult.queries?.length)
      if (thinkResult.queries?.[0]) {
        console.log('  最初のクエリ:')
        console.log('    topic:', thinkResult.queries[0].topic)
        console.log('    category:', thinkResult.queries[0].category)
        console.log('    query:', thinkResult.queries[0].query)
        console.log('    intent:', thinkResult.queries[0].intent)
      }
    }
    
    // 手動でExecuteハンドラーをテスト
    console.log('\n=== Execute ハンドラーの手動テスト ===')
    const { Phase1Strategy } = require('./lib/orchestrated-cot-strategy')
    
    const testContext = {
      expertise: 'AI',
      style: '教育的',
      platform: 'Twitter',
      userConfig: {
        expertise: 'AI',
        style: '教育的',
        platform: 'Twitter'
      }
    }
    
    if (phase1AfterThink?.thinkResult) {
      try {
        console.log('Executeハンドラーを呼び出し中...')
        const executeResult = await Phase1Strategy.execute.handler(
          phase1AfterThink.thinkResult,
          testContext
        )
        console.log('Execute成功!')
        console.log('検索結果数:', executeResult.searchResults?.length)
      } catch (error) {
        console.error('Execute失敗:', error)
        console.error('エラータイプ:', typeof error)
        console.error('エラー詳細:', error)
      }
    }
    
  } catch (error) {
    console.error('テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testStepByStep()