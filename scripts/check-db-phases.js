#!/usr/bin/env node

/**
 * DB保存状況チェックツール
 * 各フェーズのデータがDBに正しく保存されているか確認
 * 
 * 使い方:
 * node scripts/check-db-phases.js                    # 最新10セッション
 * node scripts/check-db-phases.js [sessionId]        # 特定セッション
 * node scripts/check-db-phases.js --all              # 全セッション
 */

const { PrismaClient } = require('../app/generated/prisma')
const prisma = new PrismaClient()

// データサイズを人間が読みやすい形式に
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// JSONデータのサイズを計算
function getJsonSize(data) {
  if (!data) return 0
  return JSON.stringify(data).length
}

async function checkSession(session) {
  console.log('\n' + '='.repeat(80))
  console.log(`セッション: ${session.id}`)
  console.log(`分野: ${session.expertise} | スタイル: ${session.style} | プラットフォーム: ${session.platform}`)
  console.log(`状態: ${session.status} | 現在: Phase ${session.currentPhase}-${session.currentStep}`)
  console.log(`作成: ${session.createdAt.toLocaleString()} | 更新: ${session.updatedAt.toLocaleString()}`)
  
  // 各フェーズの保存状況
  console.log('\n📊 フェーズ別保存状況:')
  console.log('-'.repeat(80))
  console.log('Phase | THINK              | EXECUTE            | INTEGRATE          | 状態')
  console.log('-'.repeat(80))
  
  for (let phaseNum = 1; phaseNum <= 5; phaseNum++) {
    const phase = session.phases.find(p => p.phaseNumber === phaseNum)
    
    if (!phase) {
      console.log(`  ${phaseNum}   | 未開始             | 未開始             | 未開始             | -`)
      continue
    }
    
    const thinkSize = getJsonSize(phase.thinkResult)
    const execSize = getJsonSize(phase.executeResult)
    const intSize = getJsonSize(phase.integrateResult)
    
    const thinkStatus = phase.thinkResult 
      ? `✓ ${formatBytes(thinkSize).padEnd(8)} ${phase.thinkTokens || 0}t`
      : '×'
    
    const execStatus = phase.executeResult
      ? `✓ ${formatBytes(execSize).padEnd(8)} ${phase.executeDuration || 0}ms`
      : '×'
      
    const intStatus = phase.integrateResult
      ? `✓ ${formatBytes(intSize).padEnd(8)} ${phase.integrateTokens || 0}t`
      : '×'
    
    console.log(`  ${phaseNum}   | ${thinkStatus.padEnd(18)} | ${execStatus.padEnd(18)} | ${intStatus.padEnd(18)} | ${phase.status}`)
  }
  
  // 詳細データの確認
  console.log('\n📝 保存データ詳細:')
  for (const phase of session.phases) {
    console.log(`\nPhase ${phase.phaseNumber}:`)
    
    if (phase.thinkResult) {
      const keys = Object.keys(phase.thinkResult)
      console.log(`  THINK: ${keys.join(', ')}`)
      
      // Phase 1の特別な表示
      if (phase.phaseNumber === 1 && phase.thinkResult.perplexityQuestions) {
        console.log(`    → Perplexity質問数: ${phase.thinkResult.perplexityQuestions.length}`)
      }
    }
    
    if (phase.executeResult) {
      const keys = Object.keys(phase.executeResult)
      console.log(`  EXECUTE: ${keys.join(', ')}`)
      
      // Phase 1の検索結果
      if (phase.phaseNumber === 1 && phase.executeResult.searchResults) {
        console.log(`    → 検索結果: ${phase.executeResult.searchResults.length}件`)
      }
      
      // Perplexity応答の保存確認
      if (phase.executeResult.savedPerplexityResponses) {
        console.log(`    → Perplexity応答保存: ${phase.executeResult.savedPerplexityResponses.length}件`)
      }
    }
    
    if (phase.integrateResult) {
      const keys = Object.keys(phase.integrateResult)
      console.log(`  INTEGRATE: ${keys.join(', ')}`)
      
      // 各フェーズの重要な結果
      if (phase.phaseNumber === 1 && phase.integrateResult.trendedTopics) {
        console.log(`    → トレンドトピック: ${phase.integrateResult.trendedTopics.length}件`)
      } else if (phase.phaseNumber === 2 && phase.integrateResult.opportunities) {
        console.log(`    → 機会: ${phase.integrateResult.opportunities.length}件`)
      } else if (phase.phaseNumber === 3 && phase.integrateResult.concepts) {
        console.log(`    → コンセプト: ${phase.integrateResult.concepts.length}件`)
      } else if (phase.phaseNumber === 4 && phase.integrateResult.contents) {
        console.log(`    → コンテンツ: ${phase.integrateResult.contents.length}件`)
      }
    }
  }
  
  // 生成された下書き
  if (session.drafts.length > 0) {
    console.log('\n📄 生成された下書き:')
    session.drafts.forEach(draft => {
      console.log(`  ${draft.conceptNumber}. ${draft.title} (${draft.status})`)
    })
  }
  
  // 統計情報
  const totalSize = session.phases.reduce((sum, phase) => {
    return sum + getJsonSize(phase.thinkResult) + getJsonSize(phase.executeResult) + getJsonSize(phase.integrateResult)
  }, 0)
  
  console.log('\n📈 統計:')
  console.log(`  総データサイズ: ${formatBytes(totalSize)}`)
  console.log(`  総トークン数: ${session.totalTokens}`)
  console.log(`  総実行時間: ${Math.round(session.totalDuration / 1000)}秒`)
}

async function main() {
  const arg = process.argv[2]
  
  try {
    if (arg === '--all') {
      // 全セッション
      const sessions = await prisma.cotSession.findMany({
        include: {
          phases: true,
          drafts: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(`\n全セッション数: ${sessions.length}`)
      for (const session of sessions) {
        await checkSession(session)
      }
      
    } else if (arg) {
      // 特定のセッション
      const session = await prisma.cotSession.findUnique({
        where: { id: arg },
        include: {
          phases: true,
          drafts: true
        }
      })
      
      if (!session) {
        console.error('セッションが見つかりません')
        process.exit(1)
      }
      
      await checkSession(session)
      
    } else {
      // 最新10セッション
      const sessions = await prisma.cotSession.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          phases: true,
          drafts: true
        }
      })
      
      console.log(`\n最新${sessions.length}セッション:`)
      for (const session of sessions) {
        await checkSession(session)
      }
    }
    
    // DBの統計情報
    const totalSessions = await prisma.cotSession.count()
    const totalPhases = await prisma.cotPhase.count()
    const totalDrafts = await prisma.cotDraft.count()
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 DB全体の統計:')
    console.log(`  総セッション数: ${totalSessions}`)
    console.log(`  総フェーズ数: ${totalPhases}`)
    console.log(`  総下書き数: ${totalDrafts}`)
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()