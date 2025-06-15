#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkPhase4Content(sessionId) {
  try {
    const phases = await prisma.cotPhase.findMany({
      where: { sessionId },
      orderBy: { phaseNumber: 'asc' }
    })
    
    const phase3 = phases.find(p => p.phaseNumber === 3)
    const phase4 = phases.find(p => p.phaseNumber === 4)
    
    if (!phase3 || !phase4) {
      console.log('Phase 3またはPhase 4が見つかりません')
      return
    }
    
    // Phase 3の選択されたコンセプト
    const concepts = phase3.thinkResult?.concepts || []
    const selectedIndex = phase4.thinkResult?.selectedConceptIndex || 0
    const selectedConcept = concepts[selectedIndex]
    
    console.log('=== Phase 3で選択されたコンセプト ===')
    console.log(`Index: ${selectedIndex}`)
    console.log(`Title: ${selectedConcept?.title}`)
    console.log(`Hook: ${selectedConcept?.hook}`)
    console.log(`Angle: ${selectedConcept?.angle}`)
    console.log(`Key Points:`)
    selectedConcept?.keyPoints?.forEach(kp => console.log(`  - ${kp}`))
    
    console.log('\n=== Phase 4で生成されたコンテンツ ===')
    const content = phase4.integrateResult?.completeContent
    console.log(`Main Post: ${content?.mainPost}`)
    
    console.log('\n=== 一致性チェック ===')
    
    // キーワードの一致をチェック
    const conceptKeywords = [
      'スキル', '自動化', '仕事', 'キャリア', '学習', '適応'
    ]
    
    const contentKeywords = [
      '医療', '教育', 'エネルギー', '革命', '分野'
    ]
    
    const mainPost = content?.mainPost || ''
    
    const hasConceptKeywords = conceptKeywords.some(kw => mainPost.includes(kw))
    const hasContentKeywords = contentKeywords.some(kw => mainPost.includes(kw))
    
    console.log(`コンセプトのキーワード含有: ${hasConceptKeywords ? '❌ なし' : '✅ あり'}`)
    console.log(`異なるトピックのキーワード含有: ${hasContentKeywords ? '⚠️  あり' : '✅ なし'}`)
    
    if (!hasConceptKeywords && hasContentKeywords) {
      console.log('\n🔴 問題: Phase 4のコンテンツがPhase 3で選択されたコンセプトと一致していません')
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
checkPhase4Content(sessionId)