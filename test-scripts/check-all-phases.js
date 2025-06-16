#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkAllPhases(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: { phases: true }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('=== セッション情報 ===')
    console.log(`ID: ${session.id}`)
    console.log(`Expertise: ${session.expertise}`)
    console.log(`Style: ${session.style}`)
    console.log(`Platform: ${session.platform}`)
    console.log(`Status: ${session.status}`)
    console.log('')
    
    // 各フェーズを順番にチェック
    for (let i = 1; i <= 5; i++) {
      const phase = session.phases.find(p => p.phaseNumber === i)
      if (!phase) {
        console.log(`\n=== Phase ${i}: 未実行 ===`)
        continue
      }
      
      console.log(`\n=== Phase ${i} ===`)
      console.log(`Status: ${phase.status}`)
      
      // THINK結果
      if (phase.thinkResult) {
        console.log('\n[THINK Result]')
        console.log(JSON.stringify(phase.thinkResult, null, 2))
      }
      
      // EXECUTE結果
      if (phase.executeResult) {
        console.log('\n[EXECUTE Result]')
        // Phase 1のEXECUTE結果は大きいので要約
        if (i === 1) {
          const result = phase.executeResult
          console.log(`検索結果数: ${result.searchResults?.length || 0}`)
          if (result.searchResults) {
            result.searchResults.forEach((sr, idx) => {
              console.log(`  ${idx + 1}. ${sr.question}`)
              console.log(`     Category: ${sr.category}`)
              console.log(`     Strategic Intent: ${sr.strategicIntent}`)
              console.log(`     Viral Angle: ${sr.viralAngle}`)
            })
          }
        } else {
          console.log(JSON.stringify(phase.executeResult, null, 2))
        }
      }
      
      // INTEGRATE結果
      if (phase.integrateResult) {
        console.log('\n[INTEGRATE Result]')
        console.log(JSON.stringify(phase.integrateResult, null, 2))
      }
      
      // ハードコードチェック
      console.log('\n[ハードコードチェック]')
      checkForHardcoding(phase, i)
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function checkForHardcoding(phase, phaseNumber) {
  const issues = []
  
  // Phase 1のチェック
  if (phaseNumber === 1) {
    // THINKでカテゴリがA,B,C,Dに固定されていないか
    if (phase.thinkResult?.perplexityQuestions) {
      const categories = phase.thinkResult.perplexityQuestions.map(q => q.category)
      if (categories.every(c => ['A', 'B', 'C', 'D'].includes(c))) {
        issues.push('カテゴリがA,B,C,Dに固定されている可能性')
      }
    }
    
    // INTEGRATEで特定の分野に偏っていないか
    if (phase.integrateResult?.trendedTopics) {
      const topics = phase.integrateResult.trendedTopics
      // AIやテクノロジーに関連するキーワードをチェック
      const techKeywords = ['AI', '技術', 'テクノロジー', '自動化', 'デジタル']
      const allAboutTech = topics.every(t => 
        techKeywords.some(keyword => 
          t.topicName.includes(keyword) || t.summary.includes(keyword)
        )
      )
      if (allAboutTech) {
        issues.push('すべてのトピックがテクノロジー関連に偏っている')
      }
    }
  }
  
  // Phase 2のチェック
  if (phaseNumber === 2) {
    // スコアが特定の範囲に固定されていないか
    if (phase.thinkResult?.opportunities) {
      const scores = phase.thinkResult.opportunities.map(o => 
        parseInt(o.viralVelocity?.overallScore || 0)
      )
      if (scores.every(s => s >= 50 && s <= 100)) {
        issues.push('スコアが50-100の範囲に固定されている可能性')
      }
    }
  }
  
  // Phase 3のチェック
  if (phaseNumber === 3) {
    // フォーマットが特定のものに偏っていないか
    if (phase.thinkResult?.concepts) {
      const formats = phase.thinkResult.concepts.map(c => c.format)
      const uniqueFormats = [...new Set(formats)]
      if (uniqueFormats.length === 1) {
        issues.push(`すべてのコンセプトが同じフォーマット(${uniqueFormats[0]})`)
      }
    }
  }
  
  // Phase 4のチェック
  if (phaseNumber === 4) {
    // コンテンツに特定のパターンがないか
    if (phase.integrateResult?.completeContent?.mainPost) {
      const content = phase.integrateResult.completeContent.mainPost
      if (content.startsWith('🌟')) {
        issues.push('コンテンツが常に🌟で始まっている')
      }
      if (content.includes('#AI') && content.includes('#未来')) {
        issues.push('ハッシュタグが固定パターンの可能性')
      }
    }
  }
  
  // Phase 5のチェック
  if (phaseNumber === 5) {
    // KPIが固定値でないか
    if (phase.integrateResult?.kpis?.engagementRate) {
      const rate = phase.integrateResult.kpis.engagementRate
      if (rate.baseline === '3%' && rate.target === '5%' && rate.stretch === '7%') {
        issues.push('KPIが固定値(3%, 5%, 7%)になっている')
      }
    }
  }
  
  if (issues.length > 0) {
    console.log('⚠️  潜在的な問題:')
    issues.forEach(issue => console.log(`   - ${issue}`))
  } else {
    console.log('✅ ハードコードの明確な兆候は見つかりませんでした')
  }
}

const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
checkAllPhases(sessionId)