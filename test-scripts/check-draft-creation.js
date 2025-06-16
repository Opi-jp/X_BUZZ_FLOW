#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkDraftCreation(sessionId) {
  try {
    // セッション情報を取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true,
        drafts: true
      }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('セッション情報:')
    console.log(`- ID: ${session.id}`)
    console.log(`- Status: ${session.status}`)
    console.log(`- Phase: ${session.currentPhase}`)
    console.log(`- Step: ${session.currentStep}`)
    console.log(`- CompletedAt: ${session.completedAt}`)
    console.log(`- Drafts count: ${session.drafts.length}`)
    
    // Phase 3の結果を確認
    const phase3 = session.phases.find(p => p.phaseNumber === 3)
    if (phase3?.integrateResult) {
      const concepts = phase3.integrateResult.concepts || []
      console.log(`\nPhase 3 concepts count: ${concepts.length}`)
      concepts.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.title}`)
      })
    }
    
    // Phase 4の結果を確認
    const phase4 = session.phases.find(p => p.phaseNumber === 4)
    if (phase4?.integrateResult) {
      const content = phase4.integrateResult.completeContent
      console.log(`\nPhase 4 content:`)
      console.log(`- mainPost: ${content?.mainPost ? 'あり' : 'なし'}`)
      console.log(`- hashtags: ${content?.hashtags?.join(', ') || 'なし'}`)
    }
    
    // Phase 5の結果を確認
    const phase5 = session.phases.find(p => p.phaseNumber === 5)
    if (phase5?.integrateResult) {
      console.log(`\nPhase 5 strategy: ${phase5.integrateResult.finalExecutionPlan ? 'あり' : 'なし'}`)
    }
    
    // 下書き一覧
    if (session.drafts.length > 0) {
      console.log('\n作成された下書き:')
      session.drafts.forEach(draft => {
        console.log(`- ${draft.title}`)
        console.log(`  Hook: ${draft.hook}`)
        console.log(`  Status: ${draft.status}`)
      })
    } else {
      console.log('\n下書きがまだ作成されていません')
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// コマンドライン引数から取得
const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
checkDraftCreation(sessionId)