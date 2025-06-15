/**
 * CoTシステムのローカルテスト
 * 
 * 使用方法:
 * node test-cot-local.js
 */

require('dotenv').config({ path: '.env.local' })

async function testCotSystem() {
  console.log('🚀 CoTシステムのローカルテストを開始します...\n')
  
  const baseUrl = 'http://localhost:3000'
  
  try {
    // Step 1: セッション作成
    console.log('📋 Step 1: セッション作成')
    const createResponse = await fetch(`${baseUrl}/api/viral/cot-session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expertise: 'AI',
        style: '教育的',
        platform: 'Twitter'
      })
    })
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`セッション作成失敗: ${createResponse.status} - ${errorText}`)
    }
    
    const createResult = await createResponse.json()
    console.log('✅ セッション作成成功:', createResult.sessionId)
    console.log('   設定:', {
      expertise: 'AI',
      style: '教育的',
      platform: 'Twitter'
    })
    
    const sessionId = createResult.sessionId
    
    // Step 2: Phase 1実行
    console.log('\n📋 Step 2: Phase 1実行（トレンド収集）')
    console.log('   Phase 1-1: Think (検索クエリ生成)...')
    
    let processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!processResponse.ok) {
      const errorText = await processResponse.text()
      throw new Error(`Phase 1-1処理失敗: ${processResponse.status} - ${errorText}`)
    }
    
    let processResult = await processResponse.json()
    console.log('✅ Phase 1-1完了 (Think)')
    
    // Phase 1-2: Execute
    if (processResult.step === 'THINK' && processResult.nextStep === 'EXECUTE') {
      console.log('   Phase 1-2: Execute (Perplexity検索)...')
      
      // 2秒待機
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!processResponse.ok) {
        const errorText = await processResponse.text()
        throw new Error(`Phase 1-2処理失敗: ${processResponse.status} - ${errorText}`)
      }
      
      processResult = await processResponse.json()
      console.log('✅ Phase 1-2完了 (Execute)')
    }
    
    // Phase 1-3: Integrate
    if (processResult.step === 'EXECUTE' && processResult.nextStep === 'INTEGRATE') {
      console.log('   Phase 1-3: Integrate (結果分析)...')
      
      // 2秒待機
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!processResponse.ok) {
        const errorText = await processResponse.text()
        throw new Error(`Phase 1-3処理失敗: ${processResponse.status} - ${errorText}`)
      }
      
      processResult = await processResponse.json()
      console.log('✅ Phase 1-3完了 (Integrate)')
      
      // Phase 1の結果を表示
      if (processResult.result?.trendedTopics) {
        console.log(`   特定されたトピック数: ${processResult.result.trendedTopics.length}`)
        processResult.result.trendedTopics.forEach((topic, index) => {
          console.log(`   ${index + 1}. ${topic.topicName} (${topic.category})`)
        })
      }
    }
    
    // Phase 1完了確認
    if (processResult.phaseCompleted && processResult.nextPhase === 2) {
      console.log('\n✅ Phase 1完了！')
      console.log('   メッセージ:', processResult.message)
      console.log('\n💡 次のステップ:')
      console.log('   1. Phase 2-5を実行するには、再度 process APIを呼び出してください')
      console.log('   2. または、Vercelにデプロイ後、UIから操作してください')
      console.log(`   3. セッションID: ${sessionId}`)
    }
    
    // セッション状態の最終確認
    console.log('\n📊 セッション状態の確認')
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: { phases: true }
    })
    
    console.log('   現在のフェーズ:', session.currentPhase)
    console.log('   現在のステップ:', session.currentStep)
    console.log('   ステータス:', session.status)
    console.log('   作成されたフェーズ数:', session.phases.length)
    
    await prisma.$disconnect()
    
    console.log('\n✅ テスト完了！')
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    console.error('詳細:', error)
  }
}

// 実行
console.log('================================')
console.log('CoTシステム ローカルテスト')
console.log('================================\n')

testCotSystem().catch(console.error)