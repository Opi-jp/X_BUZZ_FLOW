#!/usr/bin/env node

/**
 * Phase 1のDB保存テスト
 * Prisma接続とデータ保存を確実に確認するためのスクリプト
 */

const { PrismaClient } = require('../app/generated/prisma')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testPhase1Save() {
  console.log('=== Phase 1 DB保存テスト ===\n')
  
  try {
    // 1. DB接続確認
    console.log('1. DB接続確認...')
    await prisma.$connect()
    console.log('✅ DB接続成功\n')
    
    // 2. テストセッション作成
    console.log('2. テストセッション作成...')
    const session = await prisma.cotSession.create({
      data: {
        expertise: 'AIと働き方',
        style: '教育的',
        platform: 'Twitter',
        status: 'PENDING'
      }
    })
    console.log(`✅ セッション作成成功: ${session.id}\n`)
    
    // 3. Phase 1作成
    console.log('3. Phase 1作成...')
    const phase1 = await prisma.cotPhase.create({
      data: {
        sessionId: session.id,
        phaseNumber: 1,
        status: 'PENDING'
      }
    })
    console.log(`✅ Phase 1作成成功\n`)
    
    // 4. Think結果保存（新形式）
    console.log('4. Think結果保存（自然言語質問形式）...')
    const thinkResult = {
      searchStrategy: {
        approach: "最新のAI技術と働き方の変化を調査",
        timeframeRationale: "2025年のAI進化は急速なため最新情報が必要",
        expectedInsights: "AIエージェントによる働き方の具体的変化"
      },
      perplexityQuestions: [
        {
          question: "2025年6月のAIエージェントによる働き方の変化について、具体的な事例と議論を教えてください",
          category: "A",
          strategicIntent: "最新の実例を収集",
          viralAngle: "未来の働き方への不安と期待"
        }
      ]
    }
    
    await prisma.cotPhase.update({
      where: { id: phase1.id },
      data: {
        thinkResult: thinkResult,
        thinkAt: new Date(),
        status: 'THINKING'
      }
    })
    console.log('✅ Think結果保存成功\n')
    
    // 5. Execute結果保存（Perplexity応答含む）
    console.log('5. Execute結果保存...')
    const executeResult = {
      searchResults: [
        {
          question: "2025年6月のAIエージェントによる働き方の変化",
          category: "A",
          analysis: "AIエージェントが日常業務の70%を自動化...",
          sources: [
            { title: "AI革命記事", url: "https://example.com/ai-revolution", date: "2025-06-14" }
          ],
          rawResponse: "完全な応答テキスト..."
        }
      ],
      perplexityResponses: [
        {
          question: "2025年6月のAIエージェントによる働き方の変化",
          response: "完全な応答テキスト...",
          timestamp: new Date().toISOString()
        }
      ],
      totalResults: 1,
      searchMethod: "natural_language"
    }
    
    await prisma.cotPhase.update({
      where: { id: phase1.id },
      data: {
        executeResult: executeResult,
        perplexityResponses: executeResult.perplexityResponses,
        executeAt: new Date(),
        status: 'EXECUTING'
      }
    })
    console.log('✅ Execute結果保存成功（Perplexity応答含む）\n')
    
    // 6. 保存データの確認
    console.log('6. 保存データの確認...')
    const savedPhase = await prisma.cotPhase.findUnique({
      where: { id: phase1.id }
    })
    
    console.log('保存されたデータ:')
    console.log('- thinkResult:', savedPhase.thinkResult ? '✅' : '❌')
    console.log('- executeResult:', savedPhase.executeResult ? '✅' : '❌')
    console.log('- perplexityResponses:', savedPhase.perplexityResponses ? '✅' : '❌')
    
    console.log('\n✅ Phase 1 DB保存テスト完了')
    console.log(`\nセッションID: ${session.id}`)
    console.log('このIDを使ってPhase 2以降のテストが可能です')
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error)
    console.error('\n詳細:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
testPhase1Save()