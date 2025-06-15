#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function debugPhase3(sessionId) {
  try {
    const phase3 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 3
        }
      }
    })
    
    if (!phase3) {
      console.log('Phase 3が見つかりません')
      return
    }
    
    console.log('Phase 3 Details:')
    console.log('- Status:', phase3.status)
    console.log('- Think Result:', JSON.stringify(phase3.thinkResult, null, 2))
    console.log('- Execute Result:', JSON.stringify(phase3.executeResult, null, 2))
    console.log('- Integrate Result:', JSON.stringify(phase3.integrateResult, null, 2))
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
debugPhase3(sessionId)