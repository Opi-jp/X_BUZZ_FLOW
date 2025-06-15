#!/usr/bin/env node

import { PrismaClient } from './app/generated/prisma/index.js'

const prisma = new PrismaClient()

async function debugPhase4(sessionId) {
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
    
    console.log('Phase 4 Think Result Keys:', Object.keys(phase4.thinkResult || {}))
    console.log('Phase 4 Think Result:', JSON.stringify(phase4.thinkResult, null, 2))
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || '8f372ebc-9308-466a-bb2f-016623c9c492'
debugPhase4(sessionId)