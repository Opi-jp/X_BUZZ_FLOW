#!/usr/bin/env node

/**
 * Check the actual CoT implementation status
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../app/generated/prisma')

const prisma = new PrismaClient()

async function checkCotImplementation() {
  console.log('=== Chain of Thought 実装状況確認 ===\n')
  
  try {
    // 1. 最新のCotSessionを確認
    const latestSessions = await prisma.cotSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        drafts: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })
    
    console.log(`📊 CotSession数: ${latestSessions.length}`)
    
    if (latestSessions.length > 0) {
      console.log('\n最新のセッション:')
      latestSessions.forEach((session, index) => {
        console.log(`\n${index + 1}. Session ID: ${session.id}`)
        console.log(`   Status: ${session.status}`)
        console.log(`   Phase: ${session.currentPhase}, Step: ${session.currentStep}`)
        console.log(`   Config: ${JSON.stringify(session.config)}`)
        console.log(`   Drafts: ${session.drafts.length}`)
        
        // phases情報を確認
        if (session.phases) {
          const phases = session.phases
          console.log('\n   フェーズ詳細:')
          
          // Phase 1の確認
          if (phases.phase1) {
            console.log('   Phase 1:')
            if (phases.phase1.think?.result?.queries) {
              console.log(`     - Think: ${phases.phase1.think.result.queries.length}個のクエリ生成`)
              // 最初のクエリを表示
              const firstQuery = phases.phase1.think.result.queries[0]
              if (firstQuery) {
                console.log(`       例: "${firstQuery.query}"`)
              }
            }
            if (phases.phase1.execute?.result?.searchResults) {
              console.log(`     - Execute: ${phases.phase1.execute.result.searchResults.length}件の検索実行`)
            }
            if (phases.phase1.integrate?.result?.topOpportunities) {
              console.log(`     - Integrate: ${phases.phase1.integrate.result.topOpportunities.length}個の機会特定`)
            }
          }
          
          // Phase 2の確認
          if (phases.phase2) {
            console.log('   Phase 2:')
            if (phases.phase2.think) console.log('     - Think: ✓')
            if (phases.phase2.execute) console.log('     - Execute: ✓')
            if (phases.phase2.integrate) console.log('     - Integrate: ✓')
          }
          
          // Phase 3の確認
          if (phases.phase3) {
            console.log('   Phase 3:')
            if (phases.phase3.think) console.log('     - Think: ✓')
            if (phases.phase3.execute) console.log('     - Execute: ✓')
            if (phases.phase3.integrate?.result?.concepts) {
              console.log(`     - Integrate: ${phases.phase3.integrate.result.concepts.length}個のコンセプト生成`)
            }
          }
        }
      })
    }
    
    // 2. 環境変数の確認
    console.log('\n\n🔧 環境変数設定:')
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定')
    console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ 設定済み' : '❌ 未設定')
    console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅ 設定済み' : '❌ 未設定')
    
    // 3. Google Search APIの実装確認
    console.log('\n\n🔍 Google Search API実装:')
    const GoogleSearchClient = require('../lib/google-search').GoogleSearchClient
    const googleSearch = new GoogleSearchClient()
    
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      console.log('✅ Google Search APIは設定済み')
      
      // テスト検索
      try {
        const testResults = await googleSearch.searchNews('AI latest trends', 1)
        console.log(`テスト検索: ${testResults.length}件の結果`)
      } catch (error) {
        console.log('❌ テスト検索失敗:', error.message)
      }
    } else {
      console.log('❌ Google Search APIが設定されていません')
    }
    
    // 4. 実装の分析
    console.log('\n\n📋 実装分析:')
    
    if (latestSessions.length > 0) {
      const completedSessions = latestSessions.filter(s => s.status === 'COMPLETED')
      const failedSessions = latestSessions.filter(s => s.status === 'FAILED')
      
      console.log(`完了セッション: ${completedSessions.length}`)
      console.log(`失敗セッション: ${failedSessions.length}`)
      
      // Phase 1で検索が実行されているか確認
      const sessionsWithSearch = latestSessions.filter(s => 
        s.phases?.phase1?.execute?.result?.searchResults?.length > 0
      )
      
      console.log(`\n検索実行済みセッション: ${sessionsWithSearch.length}`)
      
      if (sessionsWithSearch.length === 0) {
        console.log('⚠️  検索が実行されているセッションがありません')
        console.log('   → Google Search APIが正しく設定されているか確認してください')
      } else {
        console.log('✅ 検索は正常に実行されています')
      }
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCotImplementation().catch(console.error)