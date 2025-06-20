#!/usr/bin/env node

/**
 * 成功セッションと失敗セッションの詳細な差異分析
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()

async function analyzeSessionDifferences() {
  try {
    // 成功したセッション
    const successSession = await prisma.viralSession.findUnique({
      where: { id: 'cmc3zrryn000d1yaipzp30ach' }
    })
    
    // 失敗したセッション  
    const failedSession = await prisma.viralSession.findUnique({
      where: { id: 'cmc403mbp000l1yai0d5oi1os' }
    })
    
    console.log('\n========== SESSION COMPARISON ==========\n')
    
    // 1. Basic Information
    console.log('1️⃣ BASIC INFORMATION:')
    console.log('\n✅ Success Session:')
    console.log(`   ID: ${successSession.id}`)
    console.log(`   Status: ${successSession.status}`)
    console.log(`   Theme: ${successSession.theme}`)
    console.log(`   Created: ${successSession.createdAt}`)
    console.log(`   Updated: ${successSession.updatedAt}`)
    
    console.log('\n❌ Failed Session:')
    console.log(`   ID: ${failedSession.id}`)
    console.log(`   Status: ${failedSession.status}`)
    console.log(`   Theme: ${failedSession.theme}`)
    console.log(`   Created: ${failedSession.createdAt}`)
    console.log(`   Updated: ${failedSession.updatedAt}`)
    
    // 2. Topics Data Structure
    console.log('\n\n2️⃣ TOPICS DATA STRUCTURE:')
    console.log('\n✅ Success Session Topics:')
    console.log(`   Type: ${typeof successSession.topics}`)
    console.log(`   Length: ${successSession.topics ? successSession.topics.length : 0}`)
    console.log(`   First 500 chars:`)
    console.log('   ' + successSession.topics?.substring(0, 500)?.replace(/\n/g, '\n   '))
    
    console.log('\n❌ Failed Session Topics:')
    console.log(`   Type: ${typeof failedSession.topics}`)
    console.log(`   Length: ${failedSession.topics ? failedSession.topics.length : 0}`)
    console.log(`   First 500 chars:`)
    console.log('   ' + failedSession.topics?.substring(0, 500)?.replace(/\n/g, '\n   '))
    
    // 3. Check for JSON blocks
    console.log('\n\n3️⃣ JSON BLOCK ANALYSIS:')
    
    const successJsonMatch = successSession.topics?.match(/```json\s*([\s\S]*?)```/i)
    const failedJsonMatch = failedSession.topics?.match(/```json\s*([\s\S]*?)```/i)
    
    console.log('\n✅ Success Session:')
    console.log(`   Has JSON block: ${!!successJsonMatch}`)
    if (successJsonMatch) {
      try {
        const json = JSON.parse(successJsonMatch[1])
        console.log(`   Valid JSON: true`)
        console.log(`   JSON keys: ${Object.keys(json).join(', ')}`)
      } catch (e) {
        console.log(`   Valid JSON: false`)
        console.log(`   Parse error: ${e.message}`)
      }
    }
    
    console.log('\n❌ Failed Session:')
    console.log(`   Has JSON block: ${!!failedJsonMatch}`)
    if (failedJsonMatch) {
      try {
        const json = JSON.parse(failedJsonMatch[1])
        console.log(`   Valid JSON: true`)
        console.log(`   JSON keys: ${Object.keys(json).join(', ')}`)
      } catch (e) {
        console.log(`   Valid JSON: false`)
        console.log(`   Parse error: ${e.message}`)
      }
    }
    
    // 4. Parse topics using the parser
    console.log('\n\n4️⃣ PARSED TOPICS:')
    
    const { PerplexityResponseParser } = require('../lib/parsers/perplexity-response-parser')
    
    try {
      const successTopics = PerplexityResponseParser.parseTopics(successSession.topics)
      console.log('\n✅ Success Session:')
      console.log(`   Parsed topics count: ${successTopics.length}`)
      successTopics.forEach((topic, i) => {
        console.log(`   Topic ${i + 1}: ${topic.TOPIC}`)
      })
    } catch (e) {
      console.log('\n✅ Success Session:')
      console.log(`   Parse error: ${e.message}`)
    }
    
    try {
      const failedTopics = PerplexityResponseParser.parseTopics(failedSession.topics)
      console.log('\n❌ Failed Session:')
      console.log(`   Parsed topics count: ${failedTopics.length}`)
      failedTopics.forEach((topic, i) => {
        console.log(`   Topic ${i + 1}: ${topic.TOPIC}`)
      })
    } catch (e) {
      console.log('\n❌ Failed Session:')
      console.log(`   Parse error: ${e.message}`)
    }
    
    // 5. Concepts analysis
    console.log('\n\n5️⃣ CONCEPTS ANALYSIS:')
    console.log('\n✅ Success Session:')
    console.log(`   Has concepts: ${!!successSession.concepts}`)
    console.log(`   Concepts type: ${typeof successSession.concepts}`)
    console.log(`   Concepts count: ${Array.isArray(successSession.concepts) ? successSession.concepts.length : 0}`)
    
    console.log('\n❌ Failed Session:')
    console.log(`   Has concepts: ${!!failedSession.concepts}`)
    console.log(`   Concepts type: ${typeof failedSession.concepts}`)
    console.log(`   Concepts count: ${Array.isArray(failedSession.concepts) ? failedSession.concepts.length : 0}`)
    
    // 6. selectedIds analysis
    console.log('\n\n6️⃣ SELECTED IDS:')
    console.log('\n✅ Success Session:')
    console.log(`   Has selectedIds: ${!!successSession.selectedIds}`)
    console.log(`   selectedIds: ${JSON.stringify(successSession.selectedIds)}`)
    
    console.log('\n❌ Failed Session:')
    console.log(`   Has selectedIds: ${!!failedSession.selectedIds}`)
    console.log(`   selectedIds: ${JSON.stringify(failedSession.selectedIds)}`)
    
    // 7. Drafts created
    console.log('\n\n7️⃣ DRAFTS CREATED:')
    
    const successDrafts = await prisma.viralDraftV2.findMany({
      where: { sessionId: successSession.id }
    })
    
    const failedDrafts = await prisma.viralDraftV2.findMany({
      where: { sessionId: failedSession.id }
    })
    
    console.log('\n✅ Success Session:')
    console.log(`   Drafts count: ${successDrafts.length}`)
    successDrafts.forEach((draft, i) => {
      console.log(`   Draft ${i + 1}: ${draft.title} (${draft.status})`)
    })
    
    console.log('\n❌ Failed Session:')
    console.log(`   Drafts count: ${failedDrafts.length}`)
    failedDrafts.forEach((draft, i) => {
      console.log(`   Draft ${i + 1}: ${draft.title} (${draft.status})`)
    })
    
    // 8. Time analysis
    console.log('\n\n8️⃣ TIME ANALYSIS:')
    
    const successDuration = new Date(successSession.updatedAt) - new Date(successSession.createdAt)
    const failedDuration = new Date(failedSession.updatedAt) - new Date(failedSession.createdAt)
    
    console.log('\n✅ Success Session:')
    console.log(`   Duration: ${Math.round(successDuration / 1000)}s`)
    console.log(`   Average per phase: ${Math.round(successDuration / 1000 / 5)}s`)
    
    console.log('\n❌ Failed Session:')
    console.log(`   Duration: ${Math.round(failedDuration / 1000)}s`)
    console.log(`   Got stuck after: ${Math.round(failedDuration / 1000)}s`)
    
    console.log('\n========================================\n')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeSessionDifferences()