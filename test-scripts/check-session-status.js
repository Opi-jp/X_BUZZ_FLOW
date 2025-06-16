#!/usr/bin/env node

const { PrismaClient } = require('./app/generated/prisma')

const prisma = new PrismaClient()

async function checkSessionStatus(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true
      }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('📊 セッション状態:')
    console.log(`   ステータス: ${session.status}`)
    console.log(`   現在のフェーズ: ${session.currentPhase}`)
    console.log(`   現在のステップ: ${session.currentStep}`)
    console.log(`   最終エラー: ${session.lastError || 'なし'}`)
    console.log('')
    
    session.phases.forEach(phase => {
      console.log(`📌 Phase ${phase.phaseNumber}:`)
      console.log(`   ステータス: ${phase.status}`)
      console.log(`   Think完了: ${phase.thinkAt ? '✅' : '❌'}`)
      console.log(`   Execute完了: ${phase.executeAt ? '✅' : '❌'}`)
      console.log(`   Integrate完了: ${phase.integrateAt ? '✅' : '❌'}`)
      
      if (phase.executeResult) {
        const result = phase.executeResult
        console.log(`   検索結果数: ${result.totalResults || 0}`)
        console.log(`   検索方法: ${result.searchMethod}`)
      }
      
      if (phase.perplexityResponses) {
        console.log(`   Perplexity応答: ${phase.perplexityResponses.length}件保存済み`)
      }
      
      console.log('')
    })
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// セッションIDを引数から取得
const sessionId = process.argv[2] || 'ebd35bca-9b18-4ea4-939b-3df9b94fddaf'
checkSessionStatus(sessionId)