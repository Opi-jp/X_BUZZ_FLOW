/**
 * Phase 1デバッグテスト
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('./app/generated/prisma')
const prisma = new PrismaClient()

async function debugPhase1() {
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
    
    // 各ステップの後でDB状態を確認
    async function checkDbState(step) {
      const session = await prisma.cotSession.findUnique({
        where: { id: sessionId },
        include: { phases: true }
      })
      console.log(`\n[DB確認 - ${step}]`)
      console.log(`  ステータス: ${session.status}`)
      console.log(`  現在のフェーズ: ${session.currentPhase}`)
      console.log(`  現在のステップ: ${session.currentStep}`)
      console.log(`  フェーズ数: ${session.phases.length}`)
      
      if (session.phases.length > 0) {
        const phase1 = session.phases[0]
        console.log(`  Phase 1状態:`)
        console.log(`    - thinkResult: ${phase1.thinkResult ? '有' : '無'}`)
        console.log(`    - executeResult: ${phase1.executeResult ? '有' : '無'}`)
        console.log(`    - integrateResult: ${phase1.integrateResult ? '有' : '無'}`)
        console.log(`    - status: ${phase1.status}`)
      }
    }
    
    // Phase 1-1: Think
    console.log('\n2. Phase 1-1: Think')
    let res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    let result = await res.json()
    console.log(`   レスポンス: ${JSON.stringify(result, null, 2).substring(0, 200)}...`)
    
    await checkDbState('After Think')
    await new Promise(r => setTimeout(r, 3000))
    
    // Phase 1-2: Execute
    console.log('\n3. Phase 1-2: Execute')
    res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    result = await res.json()
    console.log(`   ステータス: ${result.success ? '成功' : '失敗'}`)
    console.log(`   現在のステップ: ${result.step}`)
    
    await checkDbState('After Execute')
    await new Promise(r => setTimeout(r, 3000))
    
    // Phase 1-3: Integrate
    console.log('\n4. Phase 1-3: Integrate')
    res = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    result = await res.json()
    console.log(`   ステータス: ${result.success ? '成功' : '失敗'}`)
    console.log(`   メッセージ: ${result.message}`)
    console.log(`   フェーズ完了: ${result.phaseCompleted}`)
    
    await checkDbState('After Integrate')
    
  } catch (error) {
    console.error('エラー:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugPhase1()