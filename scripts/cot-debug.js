#!/usr/bin/env node

/**
 * CoT デバッグツール
 * 
 * 使い方:
 * node scripts/cot-debug.js [セッションID] [フェーズ] [ステップ]
 * 
 * 例:
 * node scripts/cot-debug.js abc123              # セッション全体を確認
 * node scripts/cot-debug.js abc123 2            # Phase 2の結果を確認
 * node scripts/cot-debug.js abc123 1 INTEGRATE  # Phase 1のINTEGRATE結果を確認
 */

const { PrismaClient } = require('../app/generated/prisma')
const prisma = new PrismaClient()

async function main() {
  const [sessionId, phaseNumber, step] = process.argv.slice(2)
  
  if (!sessionId) {
    console.log('使い方: node scripts/cot-debug.js [セッションID] [フェーズ] [ステップ]')
    console.log('\n最近のセッション:')
    
    const recentSessions = await prisma.cotSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        expertise: true,
        currentPhase: true,
        currentStep: true,
        status: true,
        createdAt: true
      }
    })
    
    recentSessions.forEach(s => {
      console.log(`${s.id} | ${s.expertise} | Phase ${s.currentPhase}-${s.currentStep} | ${s.status} | ${s.createdAt.toLocaleString()}`)
    })
    
    process.exit(0)
  }
  
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
    console.error(`セッション ${sessionId} が見つかりません`)
    process.exit(1)
  }
  
  console.log('\n=== セッション情報 ===')
  console.log(`ID: ${session.id}`)
  console.log(`分野: ${session.expertise}`)
  console.log(`スタイル: ${session.style}`)
  console.log(`プラットフォーム: ${session.platform}`)
  console.log(`ステータス: ${session.status}`)
  console.log(`現在: Phase ${session.currentPhase} - ${session.currentStep}`)
  console.log(`作成日時: ${session.createdAt.toLocaleString()}`)
  
  if (phaseNumber) {
    // 特定のフェーズを表示
    const phase = session.phases.find(p => p.phaseNumber === parseInt(phaseNumber))
    if (!phase) {
      console.error(`Phase ${phaseNumber} が見つかりません`)
      process.exit(1)
    }
    
    console.log(`\n=== Phase ${phaseNumber} ===`)
    console.log(`ステータス: ${phase.status}`)
    
    if (!step || step === 'THINK') {
      if (phase.thinkResult) {
        console.log('\n--- THINK結果 ---')
        console.log(JSON.stringify(phase.thinkResult, null, 2))
        console.log(`トークン数: ${phase.thinkTokens}`)
        console.log(`実行時刻: ${phase.thinkAt?.toLocaleString()}`)
      }
    }
    
    if (!step || step === 'EXECUTE') {
      if (phase.executeResult) {
        console.log('\n--- EXECUTE結果 ---')
        console.log(JSON.stringify(phase.executeResult, null, 2))
        console.log(`実行時間: ${phase.executeDuration}ms`)
        console.log(`実行時刻: ${phase.executeAt?.toLocaleString()}`)
      }
    }
    
    if (!step || step === 'INTEGRATE') {
      if (phase.integrateResult) {
        console.log('\n--- INTEGRATE結果 ---')
        console.log(JSON.stringify(phase.integrateResult, null, 2))
        console.log(`トークン数: ${phase.integrateTokens}`)
        console.log(`実行時刻: ${phase.integrateAt?.toLocaleString()}`)
      }
    }
  } else {
    // 全フェーズのサマリーを表示
    console.log('\n=== フェーズサマリー ===')
    session.phases.forEach(phase => {
      console.log(`\nPhase ${phase.phaseNumber}: ${phase.status}`)
      
      if (phase.thinkResult) {
        console.log(`  THINK: ✓ (${phase.thinkTokens} tokens)`)
        // キーだけ表示
        console.log(`    Keys: ${Object.keys(phase.thinkResult).join(', ')}`)
      }
      
      if (phase.executeResult) {
        console.log(`  EXECUTE: ✓ (${phase.executeDuration}ms)`)
        if (phase.executeResult.searchResults) {
          console.log(`    検索結果: ${phase.executeResult.searchResults.length}件`)
        }
      }
      
      if (phase.integrateResult) {
        console.log(`  INTEGRATE: ✓ (${phase.integrateTokens} tokens)`)
        // 重要な結果を表示
        if (phase.phaseNumber === 1 && phase.integrateResult.trendedTopics) {
          console.log(`    トレンド: ${phase.integrateResult.trendedTopics.length}件`)
        } else if (phase.phaseNumber === 2 && phase.integrateResult.opportunities) {
          console.log(`    機会: ${phase.integrateResult.opportunities.length}件`)
        } else if (phase.phaseNumber === 3 && phase.integrateResult.concepts) {
          console.log(`    コンセプト: ${phase.integrateResult.concepts.length}件`)
        } else if (phase.phaseNumber === 4 && phase.integrateResult.contents) {
          console.log(`    コンテンツ: ${phase.integrateResult.contents.length}件`)
        }
      }
    })
    
    if (session.drafts.length > 0) {
      console.log('\n=== 生成された下書き ===')
      session.drafts.forEach(draft => {
        console.log(`\n下書き${draft.conceptNumber}: ${draft.title}`)
        console.log(`  フック: ${draft.hook}`)
        console.log(`  角度: ${draft.angle}`)
        console.log(`  ステータス: ${draft.status}`)
        if (draft.content) {
          console.log(`  コンテンツ: ${draft.content.substring(0, 100)}...`)
        }
      })
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())