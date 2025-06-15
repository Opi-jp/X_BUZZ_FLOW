#!/usr/bin/env node

/**
 * セッションのステータスをPENDINGに戻すスクリプト
 * 処理中のステータスでスタックしたセッションを再実行可能にする
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetSessionToPending(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      console.error('❌ セッションが見つかりません:', sessionId)
      return
    }
    
    console.log('現在のセッション状態:')
    console.log(`- ID: ${session.id}`)
    console.log(`- Status: ${session.status}`)
    console.log(`- Phase: ${session.currentPhase}`)
    console.log(`- Step: ${session.currentStep}`)
    console.log(`- UpdatedAt: ${session.updatedAt}`)
    
    // ステータスをPENDINGに戻す
    const updated = await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        lastError: null,
        retryCount: 0,
        nextRetryAt: null
      }
    })
    
    console.log('\n✅ セッションをPENDINGに戻しました')
    console.log(`- New Status: ${updated.status}`)
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// コマンドライン引数から取得
const sessionId = process.argv[2]

if (!sessionId) {
  console.log('使用方法: node reset-session-to-pending.js <session-id>')
  process.exit(1)
}

resetSessionToPending(sessionId)