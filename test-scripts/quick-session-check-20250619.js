#!/usr/bin/env node

const { prisma } = require('../lib/prisma-test')

async function quickCheck() {
  const session = await prisma.viralSession.findUnique({
    where: { id: process.argv[2] || 'cmc41d7f4000w1yairw84nk28' },
    select: { status: true, topics: true, concepts: true }
  })
  
  console.log(`ステータス: ${session.status}`)
  console.log(`topics: ${session.topics ? '✓' : '✗'}`)
  console.log(`concepts: ${session.concepts ? '✓' : '✗'}`)
  
  await prisma.$disconnect()
}

quickCheck()