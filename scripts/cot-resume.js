#!/usr/bin/env node

/**
 * CoT セッション復旧ツール
 * DBに保存された最新の状態から処理を再開
 * 
 * 使い方:
 * node scripts/cot-resume.js                    # 最新のセッションから再開
 * node scripts/cot-resume.js [セッションID]      # 特定のセッションから再開
 * node scripts/cot-resume.js --list            # 再開可能なセッション一覧
 */

const { PrismaClient } = require('../app/generated/prisma')
const axios = require('axios')

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
  
  if (arg === '--list') {
    // 再開可能なセッション一覧
    const sessions = await prisma.cotSession.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'FAILED'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })
    
    console.log('=== 再開可能なセッション ===\n')
    sessions.forEach(s => {
      const lastPhase = s.phases[s.phases.length - 1]
      console.log(`ID: ${s.id}`)
      console.log(`分野: ${s.expertise} | スタイル: ${s.style}`)
      console.log(`状態: Phase ${s.currentPhase}-${s.currentStep} (${s.status})`)
      console.log(`最終更新: ${s.updatedAt.toLocaleString()}`)
      
      if (lastPhase) {
        const hasThink = !!lastPhase.thinkResult
        const hasExecute = !!lastPhase.executeResult
        const hasIntegrate = !!lastPhase.integrateResult
        console.log(`Phase ${lastPhase.phaseNumber}進捗: THINK[${hasThink ? '✓' : '×'}] EXECUTE[${hasExecute ? '✓' : '×'}] INTEGRATE[${hasIntegrate ? '✓' : '×'}]`)
      }
      console.log('---')
    })
    
    process.exit(0)
  }
  
  // セッションを取得（引数があれば特定のID、なければ最新）
  let session
  if (arg) {
    session = await prisma.cotSession.findUnique({
      where: { id: arg },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        },
        drafts: true
      }
    })
  } else {
    // 最新の未完了セッション
    session = await prisma.cotSession.findFirst({
      where: {
        status: { notIn: ['COMPLETED', 'FAILED'] }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        },
        drafts: true
      }
    })
  }
  
  if (!session) {
    console.error('再開可能なセッションが見つかりません')
    process.exit(1)
  }
  
  console.log('\n=== セッション情報 ===')
  console.log(`ID: ${session.id}`)
  console.log(`分野: ${session.expertise}`)
  console.log(`現在: Phase ${session.currentPhase} - ${session.currentStep}`)
  console.log(`ステータス: ${session.status}`)
  
  // 保存されたデータのサマリー
  console.log('\n=== 保存済みデータ ===')
  session.phases.forEach(phase => {
    console.log(`\nPhase ${phase.phaseNumber}:`)
    
    if (phase.thinkResult) {
      console.log('  ✓ THINK完了')
      const keys = Object.keys(phase.thinkResult)
      console.log(`    データ: ${keys.join(', ')}`)
      
      // Phase別の重要データを表示
      if (phase.phaseNumber === 1 && phase.thinkResult.perplexityQuestions) {
        console.log(`    質問数: ${phase.thinkResult.perplexityQuestions.length}`)
      }
    }
    
    if (phase.executeResult) {
      console.log('  ✓ EXECUTE完了')
      if (phase.executeResult.searchResults) {
        console.log(`    検索結果: ${phase.executeResult.searchResults.length}件`)
      }
      if (phase.executeResult.savedPerplexityResponses) {
        console.log(`    Perplexity応答: ${phase.executeResult.savedPerplexityResponses.length}件保存済み`)
      }
    }
    
    if (phase.integrateResult) {
      console.log('  ✓ INTEGRATE完了')
      if (phase.phaseNumber === 1 && phase.integrateResult.trendedTopics) {
        phase.integrateResult.trendedTopics.forEach((topic, i) => {
          console.log(`    トレンド${i+1}: ${topic.topicName}`)
        })
      } else if (phase.phaseNumber === 2 && phase.integrateResult.opportunities) {
        phase.integrateResult.opportunities.forEach((opp, i) => {
          console.log(`    機会${i+1}: ${opp.topic} (スコア: ${opp.viralScore})`)
        })
      } else if (phase.phaseNumber === 3 && phase.integrateResult.concepts) {
        phase.integrateResult.concepts.forEach((concept, i) => {
          console.log(`    コンセプト${i+1}: ${concept.title}`)
        })
      } else if (phase.phaseNumber === 4 && phase.integrateResult.contents) {
        phase.integrateResult.contents.forEach((content, i) => {
          console.log(`    コンテンツ${i+1}: ${content.title}`)
        })
      }
    }
  })
  
  if (session.drafts.length > 0) {
    console.log('\n=== 生成済み下書き ===')
    session.drafts.forEach(draft => {
      console.log(`下書き${draft.conceptNumber}: ${draft.title}`)
    })
  }
  
  // 再開の確認
  console.log('\n=== 処理再開 ===')
  console.log(`次のステップ: Phase ${session.currentPhase} - ${session.currentStep}`)
  console.log('\n処理を再開しますか？ (y/n): ')
  
  // ユーザー入力を待つ
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  readline.question('', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('\n処理を再開しています...')
      
      try {
        // APIを呼び出して処理を再開
        const response = await axios.post(
          `http://localhost:3000/api/viral/cot-session/${session.id}/process`,
          {},
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
        
        console.log('\n=== 処理結果 ===')
        console.log(`ステータス: ${response.data.success ? '成功' : '失敗'}`)
        
        if (response.data.phaseCompleted) {
          console.log(`Phase ${response.data.phase} が完了しました`)
          console.log(`次: Phase ${response.data.nextPhase} - ${response.data.nextStep}`)
        } else if (response.data.isCompleted) {
          console.log('すべての処理が完了しました！')
          console.log(`生成された下書き: ${response.data.draftsUrl}`)
        } else {
          console.log(`現在: Phase ${response.data.phase} - ${response.data.step}`)
          console.log(`次: Phase ${response.data.nextPhase} - ${response.data.nextStep}`)
        }
        
        if (response.data.result) {
          console.log('\n結果のサマリー:')
          const keys = Object.keys(response.data.result)
          console.log(`保存されたデータ: ${keys.join(', ')}`)
        }
        
      } catch (error) {
        console.error('\nエラーが発生しました:')
        if (error.response) {
          console.error(`ステータス: ${error.response.status}`)
          console.error(`メッセージ: ${error.response.data.error || error.response.data.message}`)
          if (error.response.data.details) {
            console.error(`詳細: ${error.response.data.details}`)
          }
        } else {
          console.error(error.message)
        }
      }
    } else {
      console.log('処理をキャンセルしました')
    }
    
    readline.close()
    await prisma.$disconnect()
  })
}

main().catch(async (error) => {
  console.error('エラー:', error)
  await prisma.$disconnect()
  process.exit(1)
})