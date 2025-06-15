#!/usr/bin/env node

/**
 * CoT フロー総合テスト
 * プロンプトが正しく動作するかを確認
 * 
 * 使い方:
 * node scripts/test-cot-flow.js              # 新規セッション作成
 * node scripts/test-cot-flow.js [sessionId]  # 既存セッション継続
 */

const axios = require('axios')
const { PrismaClient } = require('../app/generated/prisma')
const prisma = new PrismaClient()

const API_BASE = 'http://localhost:3000'

async function createSession() {
  console.log('\n=== 新規セッション作成 ===')
  
  const config = {
    expertise: 'AIと働き方の未来',
    style: '洞察的',
    platform: 'Twitter'
  }
  
  console.log('設定:', config)
  
  try {
    const response = await axios.post(`${API_BASE}/api/viral/cot-session/create`, config)
    const sessionId = response.data.sessionId
    console.log('✓ セッション作成成功:', sessionId)
    return sessionId
  } catch (error) {
    console.error('✗ セッション作成失敗:', error.response?.data || error.message)
    throw error
  }
}

async function processPhase(sessionId, expectedPhase) {
  console.log(`\n=== Phase ${expectedPhase} 処理開始 ===`)
  
  try {
    const startTime = Date.now()
    const response = await axios.post(`${API_BASE}/api/viral/cot-session/${sessionId}/process`)
    const duration = Date.now() - startTime
    
    const { phase, step, phaseCompleted, isCompleted, result } = response.data
    
    console.log(`✓ Phase ${phase} - ${step} 完了 (${duration}ms)`)
    
    if (result) {
      // 重要な結果を表示
      if (phase === 1 && result.trendedTopics) {
        console.log(`  → トレンド発見: ${result.trendedTopics.length}件`)
        result.trendedTopics.forEach((topic, i) => {
          console.log(`    ${i+1}. ${topic.topicName}`)
        })
      } else if (phase === 2 && result.opportunities) {
        console.log(`  → 機会評価: ${result.opportunities.length}件`)
      } else if (phase === 3 && result.concepts) {
        console.log(`  → コンセプト生成: ${result.concepts.length}件`)
        result.concepts.forEach((concept, i) => {
          console.log(`    ${i+1}. ${concept.title || concept.A}`)
        })
      } else if (phase === 4 && result.contents) {
        console.log(`  → コンテンツ生成: ${result.contents.length}件`)
      } else if (phase === 5) {
        console.log(`  → 実行戦略策定完了`)
      }
    }
    
    if (phaseCompleted) {
      console.log(`✓ Phase ${phase} 完了！`)
    }
    
    if (isCompleted) {
      console.log('\n🎉 全フェーズ完了！')
      return true
    }
    
    return false
  } catch (error) {
    console.error(`✗ Phase ${expectedPhase} エラー:`, error.response?.data || error.message)
    
    // エラー詳細を表示
    if (error.response?.data?.details) {
      console.error('詳細:', error.response.data.details)
    }
    
    throw error
  }
}

async function checkDrafts(sessionId) {
  console.log('\n=== 生成された下書き確認 ===')
  
  const drafts = await prisma.cotDraft.findMany({
    where: { sessionId },
    orderBy: { conceptNumber: 'asc' }
  })
  
  console.log(`下書き数: ${drafts.length}`)
  
  drafts.forEach(draft => {
    console.log(`\n下書き${draft.conceptNumber}: ${draft.title}`)
    console.log(`  フック: ${draft.hook}`)
    console.log(`  角度: ${draft.angle}`)
    console.log(`  形式: ${draft.format}`)
    if (draft.content) {
      console.log(`  コンテンツ: ${draft.content.substring(0, 100)}...`)
    }
  })
}

async function main() {
  try {
    let sessionId = process.argv[2]
    
    if (!sessionId) {
      // 新規セッション作成
      sessionId = await createSession()
    } else {
      console.log(`\n既存セッション使用: ${sessionId}`)
      
      // セッション状態確認
      const session = await prisma.cotSession.findUnique({
        where: { id: sessionId },
        include: { phases: true }
      })
      
      if (!session) {
        console.error('セッションが見つかりません')
        process.exit(1)
      }
      
      console.log(`現在の状態: Phase ${session.currentPhase} - ${session.currentStep} (${session.status})`)
    }
    
    console.log('\n処理を開始します...\n')
    
    // 各フェーズを順番に処理
    let completed = false
    let retryCount = 0
    const maxRetries = 20 // 最大20回（各フェーズ3ステップ × 5フェーズ + 余裕）
    
    while (!completed && retryCount < maxRetries) {
      // 現在の状態を確認
      const currentSession = await prisma.cotSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!currentSession) {
        throw new Error('セッションが消失しました')
      }
      
      console.log(`\n[${retryCount + 1}/${maxRetries}] 現在: Phase ${currentSession.currentPhase} - ${currentSession.currentStep}`)
      
      // 処理実行
      completed = await processPhase(sessionId, currentSession.currentPhase)
      
      // 少し待機（API負荷軽減）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      retryCount++
    }
    
    if (completed) {
      console.log('\n✅ 全ての処理が正常に完了しました！')
      
      // 生成された下書きを確認
      await checkDrafts(sessionId)
      
      console.log('\n=== サマリー ===')
      console.log(`セッションID: ${sessionId}`)
      console.log(`総実行回数: ${retryCount}`)
      
      // 最終的なトークン使用量を表示
      const finalSession = await prisma.cotSession.findUnique({
        where: { id: sessionId }
      })
      console.log(`総トークン数: ${finalSession.totalTokens}`)
      console.log(`総実行時間: ${Math.round(finalSession.totalDuration / 1000)}秒`)
    } else {
      console.error('\n❌ 処理が完了しませんでした')
    }
    
  } catch (error) {
    console.error('\n致命的なエラー:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  process.exit(1)
})

main()