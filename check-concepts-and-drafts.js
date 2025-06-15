#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkConceptsAndDrafts(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        },
        drafts: {
          orderBy: { conceptNumber: 'asc' }
        }
      }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('=== セッション概要 ===')
    console.log(`ID: ${session.id}`)
    console.log(`Status: ${session.status}`)
    console.log('')
    
    // Phase 3のコンセプトを確認
    const phase3 = session.phases.find(p => p.phaseNumber === 3)
    const concepts = phase3?.thinkResult?.concepts || []
    
    console.log('=== Phase 3: 生成されたコンセプト ===')
    console.log(`コンセプト数: ${concepts.length}`)
    concepts.forEach((concept, i) => {
      console.log(`\n[コンセプト ${i + 1}]`)
      console.log(`Title: ${concept.title}`)
      console.log(`Hook: ${concept.hook}`)
      console.log(`Format: ${concept.format}`)
      console.log(`Angle: ${concept.angle}`)
    })
    
    // Phase 4で選択されたコンセプト
    const phase4 = session.phases.find(p => p.phaseNumber === 4)
    const selectedIndex = phase4?.thinkResult?.selectedConceptIndex
    console.log(`\n=== Phase 4: 選択されたコンセプト ===`)
    console.log(`選択されたインデックス: ${selectedIndex}`)
    console.log(`選択されたタイトル: ${concepts[selectedIndex]?.title || '不明'}`)
    
    // Phase 4で生成されたコンテンツ
    const completeContent = phase4?.integrateResult?.completeContent
    const alternativeVersions = phase4?.integrateResult?.alternativeVersions || []
    
    console.log(`\n=== Phase 4: 生成されたコンテンツ ===`)
    console.log(`メインコンテンツ: ${completeContent ? '✅' : '❌'}`)
    console.log(`代替バージョン数: ${alternativeVersions.length}`)
    alternativeVersions.forEach((alt, i) => {
      console.log(`  - Version ${alt.version}: ${alt.variation}`)
    })
    
    // 下書きの確認
    console.log(`\n=== 下書き ===`)
    console.log(`下書き総数: ${session.drafts.length}`)
    session.drafts.forEach(draft => {
      console.log(`\n[下書き ${draft.conceptNumber}]`)
      console.log(`Title: ${draft.title}`)
      console.log(`Status: ${draft.status}`)
      console.log(`Content: ${draft.content?.substring(0, 100)}...`)
    })
    
    // 期待値との比較
    console.log(`\n=== 期待値との比較 ===`)
    const expectedConcepts = 3
    const expectedDrafts = 3
    
    console.log(`コンセプト数: ${concepts.length} / ${expectedConcepts} ${concepts.length === expectedConcepts ? '✅' : '❌'}`)
    console.log(`下書き数: ${session.drafts.length} / ${expectedDrafts} ${session.drafts.length === expectedDrafts ? '✅' : '❌'}`)
    
    if (session.drafts.length === 1) {
      console.log(`\n⚠️  問題: 3つのコンセプトが生成されたが、下書きは1つしか作成されていません`)
      console.log(`原因: Phase 4では選択された1つのコンセプトのみコンテンツ化している可能性`)
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || 'a2a3c490-c41d-4db8-964c-7964c83f21b7'
checkConceptsAndDrafts(sessionId)