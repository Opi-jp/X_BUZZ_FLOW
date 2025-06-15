#!/usr/bin/env node

import { PrismaClient } from '../app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function createDraftManually(sessionId) {
  try {
    // セッションと関連フェーズを取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: { phases: true }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    const phase3 = session.phases.find(p => p.phaseNumber === 3)
    const phase4 = session.phases.find(p => p.phaseNumber === 4)
    const phase5 = session.phases.find(p => p.phaseNumber === 5)
    
    // Phase 3のコンセプトはthinkResultに存在
    const concepts = phase3?.thinkResult?.concepts || []
    const selectedIndex = phase4?.thinkResult?.selectedConceptIndex || 0
    const finalContent = phase4?.integrateResult?.completeContent || {}
    const strategy = phase5?.integrateResult || {}
    
    console.log(`Found ${concepts.length} concepts`)
    console.log(`Selected index: ${selectedIndex}`)
    console.log(`Final content exists: ${!!finalContent.mainPost}`)
    
    if (concepts.length > 0) {
      console.log('First concept:', concepts[0].title)
    }
    
    // 選択されたコンセプトの下書きを作成
    const selectedConcept = concepts[selectedIndex]
    console.log('Selected concept exists:', !!selectedConcept)
    console.log('Main post content:', finalContent.mainPost?.substring(0, 100) + '...')
    
    if (selectedConcept && finalContent.mainPost) {
      const draft = await prisma.cotDraft.create({
        data: {
          sessionId: session.id,
          conceptNumber: selectedIndex + 1,
          title: selectedConcept.title,
          hook: selectedConcept.hook,
          angle: selectedConcept.angle,
          format: selectedConcept.format || 'single',
          content: finalContent.mainPost,
          // threadContent: finalContent.threadPosts || null, // スキーマでコメントアウトされている
          visualGuide: selectedConcept.visual || finalContent.visualDescription,
          timing: strategy.finalExecutionPlan?.bestTimeToPost?.[0] || selectedConcept.timing || '',
          hashtags: finalContent.hashtags || selectedConcept.hashtags || [],
          newsSource: selectedConcept.newsSource || '',
          sourceUrl: selectedConcept.sourceUrl || null,
          kpis: strategy.kpis || null,
          riskAssessment: strategy.riskAssessment || null,
          optimizationTips: strategy.finalExecutionPlan?.followUpStrategy || null,
          status: 'DRAFT'
        }
      })
      
      console.log('✅ 下書きを作成しました:')
      console.log(`- Title: ${draft.title}`)
      console.log(`- Hook: ${draft.hook}`)
      console.log(`- ID: ${draft.id}`)
    } else {
      console.log('❌ 下書きの作成に必要なデータが不足しています')
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
createDraftManually(sessionId)