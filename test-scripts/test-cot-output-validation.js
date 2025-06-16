/**
 * CoTシステム出力検証テスト
 * 
 * 各フェーズの出力が仕様書通りか検証
 * 
 * 使用方法:
 * node test-cot-output-validation.js
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

// 仕様書から期待される出力形式
const expectedOutputFormats = {
  phase1: {
    think: {
      requiredFields: ['analysisApproach', 'queries'],
      analysisApproachFields: ['A_currentEvents', 'B_technology', 'C_socialListening', 'D_viralPatterns'],
      queryFields: ['category', 'topic', 'query', 'queryJa', 'intent', 'viralPotential'],
      viralPotentialFields: ['controversy', 'emotion', 'relatability', 'shareability', 'timeSensitivity', 'platformFit']
    },
    integrate: {
      requiredFields: ['trendedTopics', 'categoryInsights', 'topicCount', 'collectionSummary', 'nextStepMessage'],
      topicFields: ['topicName', 'category', 'summary', 'sources', 'currentStatus', 'viralElements', 'expertiseRelevance'],
      viralElementFields: ['controversy', 'emotion', 'relatability', 'shareability', 'timeSensitivity', 'platformFit']
    }
  },
  phase2: {
    think: {
      requiredFields: ['evaluatedOpportunities', 'topOpportunities', 'analysisInsights'],
      opportunityFields: ['topicName', 'viralVelocityScore', 'velocityMetrics', 'contentAngles', 'overallScore', 'reasoning']
    },
    integrate: {
      requiredFields: ['finalEvaluation', 'selectedOpportunities', 'evaluationSummary', 'nextStepMessage'],
      evaluationFields: ['topicName', 'finalScore', 'viralVelocity', 'bestAngle', 'timing', 'recommendation']
    }
  },
  phase3: {
    think: {
      requiredFields: ['directions'],
      directionFields: ['opportunity', 'angles']
    },
    integrate: {
      requiredFields: ['concepts', 'summary', 'nextStepMessage'],
      conceptFields: ['number', 'title', 'opportunity', 'platform', 'format', 'hook', 'angle', 'structure', 'visual', 'timing', 'hashtags', 'expectedReaction', 'newsSource', 'sourceUrl']
    }
  },
  phase4: {
    think: {
      requiredFields: ['selectedConceptIndex', 'reasoning', 'contentStructure', 'visualElements']
    },
    integrate: {
      requiredFields: ['mainPost', 'threadPosts', 'hashtags', 'alternativeVersions', 'visualDescription', 'postingNote', 'expectedEngagement']
    }
  },
  phase5: {
    think: {
      requiredFields: ['executionTimeline', 'optimizationTechniques', 'riskAssessment', 'successMetrics']
    },
    integrate: {
      requiredFields: ['finalExecutionPlan', 'kpis', 'riskMitigation', 'summary', 'nextStepMessage']
    }
  }
}

// 検証関数
function validateOutput(phase, step, output, expectedFormat) {
  const errors = []
  const warnings = []
  
  // 必須フィールドチェック
  expectedFormat.requiredFields.forEach(field => {
    if (!output.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`)
    }
  })
  
  // フィールド内容の検証
  if (phase === 1 && step === 'think') {
    // Phase 1 Think特有の検証
    if (output.queries) {
      if (!Array.isArray(output.queries)) {
        errors.push('queries must be an array')
      } else if (output.queries.length < 3) {
        warnings.push('queries should have at least 3 items for comprehensive search')
      }
    }
  }
  
  if (phase === 1 && step === 'integrate') {
    // nextStepMessageの検証
    if (output.nextStepMessage && !output.nextStepMessage.includes('{topicCount}')) {
      warnings.push('nextStepMessage should include {topicCount} placeholder')
    }
  }
  
  if (phase === 3 && step === 'integrate') {
    // コンセプト数の検証
    if (output.concepts && output.concepts.length !== 3) {
      warnings.push(`Expected exactly 3 concepts, got ${output.concepts.length}`)
    }
  }
  
  if (phase === 4 && step === 'integrate') {
    // コンテンツが即投稿可能か検証
    if (!output.mainPost || output.mainPost.length === 0) {
      errors.push('mainPost must contain actual content ready to post')
    }
  }
  
  return { errors, warnings }
}

// テスト実行
async function runValidationTest() {
  console.log('🔍 CoTシステム出力検証テスト\n')
  
  // テスト用のモックデータでローカル検証
  console.log('📋 Phase 1 Think出力検証')
  const mockPhase1Think = {
    analysisApproach: {
      A_currentEvents: ["AIの最新動向"],
      B_technology: ["企業のAI活用"],
      C_socialListening: ["SNSでのAI議論"],
      D_viralPatterns: ["感情的な反応パターン"]
    },
    queries: [
      {
        category: "A",
        topic: "AIエージェントの活用",
        query: "AI agents workplace automation 2024",
        queryJa: "AIエージェント 職場 自動化 2024",
        intent: "最新のAIエージェント活用事例",
        viralPotential: {
          controversy: "高",
          emotion: "高",
          relatability: "高",
          shareability: "高",
          timeSensitivity: "高",
          platformFit: "高"
        }
      }
    ]
  }
  
  const phase1ThinkValidation = validateOutput(1, 'think', mockPhase1Think, expectedOutputFormats.phase1.think)
  console.log(`  ✅ 必須フィールド: ${expectedOutputFormats.phase1.think.requiredFields.join(', ')}`)
  if (phase1ThinkValidation.errors.length > 0) {
    console.log(`  ❌ エラー: ${phase1ThinkValidation.errors.join(', ')}`)
  }
  if (phase1ThinkValidation.warnings.length > 0) {
    console.log(`  ⚠️  警告: ${phase1ThinkValidation.warnings.join(', ')}`)
  }
  
  console.log('\n📋 Phase 1 Integrate出力検証')
  const mockPhase1Integrate = {
    trendedTopics: [
      {
        topicName: "AIエージェントが変える働き方",
        category: "A",
        summary: "企業でのAIエージェント導入が加速",
        sources: [
          {title: "記事1", url: "https://example.com/1"},
          {title: "記事2", url: "https://example.com/2"}
        ],
        currentStatus: "進行中",
        viralElements: {
          controversy: "高 - 雇用への影響で議論",
          emotion: "高 - 期待と不安",
          relatability: "高 - 多くの労働者に影響",
          shareability: "高 - 実例が共有されやすい",
          timeSensitivity: "高 - 今まさに起きている",
          platformFit: "高 - Twitterで議論活発"
        },
        expertiseRelevance: "AIの専門知識を活かした解説が可能"
      }
    ],
    categoryInsights: {
      A_currentEvents: "AIエージェント導入のニュースが急増",
      B_technology: "大手企業の実装事例が話題",
      C_socialListening: "Twitter上で賛否両論の議論",
      D_viralPatterns: "感情的な反応が強い"
    },
    topicCount: 1,
    collectionSummary: "AIエージェントの職場導入に関する議論が活発化",
    nextStepMessage: "情報収集が完了しました。{topicCount}件のトレンドトピックを特定しました。これらの評価と優先順位付けを行うには「次へ進む」ボタンをクリックしてください。"
  }
  
  const phase1IntegrateValidation = validateOutput(1, 'integrate', mockPhase1Integrate, expectedOutputFormats.phase1.integrate)
  console.log(`  ✅ 必須フィールド: ${expectedOutputFormats.phase1.integrate.requiredFields.join(', ')}`)
  if (phase1IntegrateValidation.errors.length > 0) {
    console.log(`  ❌ エラー: ${phase1IntegrateValidation.errors.join(', ')}`)
  }
  if (phase1IntegrateValidation.warnings.length > 0) {
    console.log(`  ⚠️  警告: ${phase1IntegrateValidation.warnings.join(', ')}`)
  }
  
  // 仕様書との照合
  console.log('\n📖 仕様書との照合チェック')
  console.log('  1. GPTに考えさせる設計か？')
  console.log('     → プロンプトで評価基準を提示し、GPTが判断する設計になっているか確認')
  console.log('  2. ハードコードされた評価基準がないか？')
  console.log('     → viralPotentialの値が「高/中/低」で、理由が含まれているか確認')
  console.log('  3. 自然言語での処理か？')
  console.log('     → 検索クエリが短い単語の羅列ではなく、文脈を含む質問になっているか確認')
  
  console.log('\n💡 重要な確認ポイント:')
  console.log('  - Phase 1: 検索クエリは動的に生成されているか（ハードコードされていないか）')
  console.log('  - Phase 2: ウイルス速度指標とコンテンツアングルが同時に評価されているか')
  console.log('  - Phase 3: 3つのコンセプトが生成され、ニュースソースが含まれているか')
  console.log('  - Phase 4: コピペ即投稿可能な完成度のコンテンツか')
  console.log('  - Phase 5: Phase 4の投稿文を参照した具体的な戦略か')
}

// ライブテスト機能（実際のAPIを呼び出して検証）
async function runLiveTest() {
  console.log('\n🔴 ライブテスト（実際のAPI呼び出し）')
  
  const baseUrl = 'http://localhost:3001'  // ポート3001で起動している場合
  
  try {
    // セッション作成
    console.log('\n1️⃣ セッション作成')
    const createResponse = await fetch(`${baseUrl}/api/viral/cot-session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expertise: 'AI',
        style: '教育的',
        platform: 'Twitter'
      })
    })
    
    const createResult = await createResponse.json()
    const sessionId = createResult.sessionId
    console.log(`  セッションID: ${sessionId}`)
    
    // Phase 1実行と検証
    console.log('\n2️⃣ Phase 1実行')
    
    // Phase 1-1: Think
    let processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    let processResult = await processResponse.json()
    
    if (processResult.result) {
      console.log('\n  Phase 1 Think結果:')
      const validation = validateOutput(1, 'think', processResult.result, expectedOutputFormats.phase1.think)
      console.log(`    エラー: ${validation.errors.length === 0 ? 'なし ✅' : validation.errors.join(', ') + ' ❌'}`)
      console.log(`    警告: ${validation.warnings.length === 0 ? 'なし ✅' : validation.warnings.join(', ') + ' ⚠️'}`)
      
      // 検索クエリの内容確認
      if (processResult.result.queries) {
        console.log(`    生成されたクエリ数: ${processResult.result.queries.length}`)
        processResult.result.queries.forEach((q, i) => {
          console.log(`    クエリ${i+1}: ${q.topic} (${q.category})`)
        })
      }
    }
    
    // 実際のフェーズデータ取得
    const { PrismaClient } = require('./app/generated/prisma')
    const prisma = new PrismaClient()
    
    const phases = await prisma.cotPhase.findMany({
      where: { sessionId },
      orderBy: { phaseNumber: 'asc' }
    })
    
    console.log(`\n  保存されたフェーズ数: ${phases.length}`)
    
    phases.forEach(phase => {
      console.log(`\n  Phase ${phase.phaseNumber}:`)
      if (phase.thinkResult) {
        console.log(`    Think結果: ${Object.keys(phase.thinkResult).join(', ')}`)
      }
      if (phase.executeResult) {
        console.log(`    Execute結果: ${Object.keys(phase.executeResult).join(', ')}`)
      }
      if (phase.integrateResult) {
        console.log(`    Integrate結果: ${Object.keys(phase.integrateResult).join(', ')}`)
      }
    })
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ ライブテストエラー:', error.message)
  }
}

// メイン実行
async function main() {
  console.log('================================')
  console.log('CoTシステム 出力検証テスト')
  console.log('================================\n')
  
  // 基本検証
  await runValidationTest()
  
  // ライブテストを実行するか確認
  const args = process.argv.slice(2)
  if (args.includes('--live')) {
    await runLiveTest()
  } else {
    console.log('\n💡 ヒント: 実際のAPIをテストするには --live オプションを付けて実行してください')
    console.log('   例: node test-cot-output-validation.js --live')
  }
}

main().catch(console.error)