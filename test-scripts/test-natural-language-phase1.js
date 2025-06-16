#!/usr/bin/env node

/**
 * 自然言語質問形式でのPhase 1テスト
 * GPTに時間範囲の判断を完全に委ねる新実装のテスト
 */

const { PrismaClient } = require('./app/generated/prisma')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testNaturalLanguagePhase1() {
  console.log('=== 自然言語形式 Phase 1 テスト ===\n')
  
  try {
    // 1. テストセッション作成
    console.log('1. テストセッション作成...')
    const session = await prisma.cotSession.create({
      data: {
        expertise: 'AIと働き方',
        style: '教育的',
        platform: 'Twitter',
        status: 'PENDING'
      }
    })
    console.log(`✅ セッション作成: ${session.id}\n`)
    
    // 2. Phase 1 APIを呼び出し
    console.log('2. Phase 1処理を開始...')
    console.log('   POST /api/viral/cot-session/[sessionId]/process')
    console.log(`   セッションID: ${session.id}\n`)
    
    const response = await fetch(`http://localhost:3000/api/viral/cot-session/${session.id}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    console.log('✅ Phase 1処理完了\n')
    
    // 3. 結果を確認
    console.log('3. 処理結果の確認...')
    const phase = await prisma.cotPhase.findFirst({
      where: {
        sessionId: session.id,
        phaseNumber: 1
      }
    })
    
    if (!phase) {
      throw new Error('Phase 1データが見つかりません')
    }
    
    console.log('📊 Phase 1結果:')
    console.log(`   状態: ${phase.status}`)
    console.log(`   Think完了: ${phase.thinkAt ? '✅' : '❌'}`)
    console.log(`   Execute完了: ${phase.executeAt ? '✅' : '❌'}`)
    console.log(`   Integrate完了: ${phase.integrateAt ? '✅' : '❌'}\n`)
    
    // Think結果の詳細
    if (phase.thinkResult) {
      const thinkResult = phase.thinkResult
      console.log('🤔 Think結果（自然言語質問）:')
      
      if (thinkResult.searchStrategy) {
        console.log('\n   検索戦略:')
        console.log(`   - アプローチ: ${thinkResult.searchStrategy.approach}`)
        console.log(`   - 時間範囲の理由: ${thinkResult.searchStrategy.timeframeRationale}`)
        console.log(`   - 期待される洞察: ${thinkResult.searchStrategy.expectedInsights}`)
      }
      
      if (thinkResult.perplexityQuestions) {
        console.log('\n   生成された質問:')
        thinkResult.perplexityQuestions.forEach((q, i) => {
          console.log(`\n   質問${i + 1}:`)
          console.log(`   "${q.question}"`)
          console.log(`   - カテゴリ: ${q.category}`)
          console.log(`   - 戦略的意図: ${q.strategicIntent}`)
          console.log(`   - バイラル要素: ${q.viralAngle}`)
        })
      }
    }
    
    // Execute結果の詳細
    if (phase.executeResult) {
      const executeResult = phase.executeResult
      console.log('\n\n🔍 Execute結果:')
      console.log(`   検索結果数: ${executeResult.totalResults || 0}`)
      console.log(`   検索方法: ${executeResult.searchMethod}`)
      
      if (executeResult.searchResults && executeResult.searchResults.length > 0) {
        console.log('\n   検索結果サンプル:')
        const sample = executeResult.searchResults[0]
        console.log(`   - 質問: "${sample.question}"`)
        console.log(`   - 分析長さ: ${sample.analysis ? sample.analysis.length : 0}文字`)
        
        if (sample.sources && sample.sources.length > 0) {
          console.log(`   - ソース数: ${sample.sources.length}`)
          console.log(`   - 例: ${sample.sources[0].title} (${sample.sources[0].url})`)
        }
      }
    }
    
    // Perplexity応答の確認
    if (phase.perplexityResponses) {
      console.log('\n\n💾 Perplexity応答:')
      console.log(`   保存された応答数: ${phase.perplexityResponses.length}`)
      console.log('   （次回のテストではこのデータを再利用可能）')
    }
    
    console.log('\n\n✅ テスト完了！')
    console.log(`\nセッションID: ${session.id}`)
    console.log('このIDを使ってPhase 2以降のテストが可能です')
    console.log('\n💡 次のステップ:')
    console.log('1. Prisma Studioで結果を確認: http://localhost:5555')
    console.log('2. 保存されたPerplexity応答を使ってPhase 2をテスト')
    console.log(`3. SESSION_ID=${session.id} node test-phase2-with-db.js`)
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error)
    console.error('\n詳細:', error.stack)
    
    // エラー診断
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 解決策: ./scripts/dev-start.sh を実行してください')
    }
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
testNaturalLanguagePhase1()