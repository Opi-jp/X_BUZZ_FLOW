#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkDBPhaseData(sessionId) {
  try {
    // セッション情報を取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        },
        drafts: true
      }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('=== セッション情報 ===')
    console.log(`ID: ${session.id}`)
    console.log(`Status: ${session.status}`)
    console.log(`Current Phase: ${session.currentPhase}`)
    console.log(`Current Step: ${session.currentStep}`)
    console.log(`Total Duration: ${session.totalDuration}ms`)
    console.log(`Total Tokens: ${session.totalTokens}`)
    console.log(`Created At: ${session.createdAt}`)
    console.log(`Completed At: ${session.completedAt}`)
    console.log('')
    
    // 各フェーズのデータを確認
    for (const phase of session.phases) {
      console.log(`=== Phase ${phase.phaseNumber} ===`)
      console.log(`Status: ${phase.status}`)
      console.log('')
      
      // THINK
      console.log('[THINK]')
      console.log(`- Executed: ${phase.thinkAt ? '✅' : '❌'}`)
      console.log(`- Tokens: ${phase.thinkTokens || 0}`)
      console.log(`- Prompt Length: ${phase.thinkPrompt?.length || 0} chars`)
      console.log(`- Result Keys: ${phase.thinkResult ? Object.keys(phase.thinkResult).join(', ') : 'なし'}`)
      if (phase.thinkResult) {
        checkDataStructure('THINK', phase.phaseNumber, phase.thinkResult)
      }
      
      // EXECUTE
      console.log('\n[EXECUTE]')
      console.log(`- Executed: ${phase.executeAt ? '✅' : '❌'}`)
      console.log(`- Duration: ${phase.executeDuration || 0}ms`)
      console.log(`- Result Keys: ${phase.executeResult ? Object.keys(phase.executeResult).join(', ') : 'なし'}`)
      if (phase.executeResult) {
        checkDataStructure('EXECUTE', phase.phaseNumber, phase.executeResult)
      }
      
      // INTEGRATE
      console.log('\n[INTEGRATE]')
      console.log(`- Executed: ${phase.integrateAt ? '✅' : '❌'}`)
      console.log(`- Tokens: ${phase.integrateTokens || 0}`)
      console.log(`- Prompt Length: ${phase.integratePrompt?.length || 0} chars`)
      console.log(`- Result Keys: ${phase.integrateResult ? Object.keys(phase.integrateResult).join(', ') : 'なし'}`)
      if (phase.integrateResult) {
        checkDataStructure('INTEGRATE', phase.phaseNumber, phase.integrateResult)
      }
      
      console.log('')
    }
    
    // 下書きデータ
    console.log('=== 下書きデータ ===')
    console.log(`総数: ${session.drafts.length}`)
    for (const draft of session.drafts) {
      console.log(`\n[Draft ${draft.conceptNumber}]`)
      console.log(`- Title: ${draft.title}`)
      console.log(`- Format: ${draft.format}`)
      console.log(`- Status: ${draft.status}`)
      console.log(`- Content Length: ${draft.content?.length || 0} chars`)
      console.log(`- Hashtags: ${draft.hashtags.join(', ')}`)
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function checkDataStructure(step, phaseNumber, data) {
  const expectedStructures = {
    1: {
      THINK: ['searchStrategy', 'perplexityQuestions'],
      EXECUTE: ['searchResults', 'perplexityResponses', 'totalResults'],
      INTEGRATE: ['trendedTopics', 'categoryInsights', 'overallAnalysis', 'topicCount']
    },
    2: {
      THINK: ['evaluationStrategy', 'opportunities', 'selectedOpportunities'],
      EXECUTE: ['evaluationStrategy', 'opportunities', 'selectedOpportunities'],
      INTEGRATE: ['opportunities', 'finalSelection', 'nextStepMessage']
    },
    3: {
      THINK: ['concepts', 'conceptStrategy'],
      EXECUTE: ['concepts', 'conceptStrategy'],
      INTEGRATE: ['optimizedConcepts', 'nextStepMessage']
    },
    4: {
      THINK: ['contentStrategy', 'platformOptimization', 'selectedConceptIndex'],
      EXECUTE: ['contentStrategy', 'platformOptimization', 'selectedConceptIndex'],
      INTEGRATE: ['completeContent', 'alternativeVersions']
    },
    5: {
      THINK: ['executionTimeline', 'optimizationTechniques'],
      EXECUTE: ['executionTimeline', 'optimizationTechniques'],
      INTEGRATE: ['finalExecutionPlan', 'riskAssessment', 'kpis', 'completionMessage']
    }
  }
  
  const expected = expectedStructures[phaseNumber]?.[step] || []
  const actual = Object.keys(data)
  const missing = expected.filter(key => !actual.includes(key))
  const extra = actual.filter(key => !expected.includes(key))
  
  if (missing.length > 0) {
    console.log(`  ⚠️  Missing keys: ${missing.join(', ')}`)
  }
  if (extra.length > 0) {
    console.log(`  ℹ️  Extra keys: ${extra.join(', ')}`)
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ✅ Structure matches expected`)
  }
}

const sessionId = process.argv[2] || 'a2a3c490-c41d-4db8-964c-7964c83f21b7'
checkDBPhaseData(sessionId)