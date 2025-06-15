#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function debugPhase4Integrate(sessionId) {
  try {
    const phase4 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 4
        }
      }
    })
    
    if (!phase4) {
      console.log('Phase 4が見つかりません')
      return
    }
    
    console.log('=== Phase 4 INTEGRATE Result ===')
    const result = phase4.integrateResult
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n=== コンテンツ詳細 ===')
    const content = result?.completeContent
    if (content) {
      console.log('Main Post:')
      console.log(content.mainPost)
      console.log('\nHashtags:', content.hashtags)
      console.log('\nThread Posts:')
      content.threadPosts?.forEach((post, i) => {
        console.log(`${i + 1}. ${post}`)
      })
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
debugPhase4Integrate(sessionId)