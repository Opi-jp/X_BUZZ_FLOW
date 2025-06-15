const { PrismaClient } = require('./app/generated/prisma')
const prisma = new PrismaClient()

async function main() {
  const sessionId = process.argv[2]
  if (\!sessionId) {
    console.error('Usage: node reset-session-state.js [sessionId]')
    process.exit(1)
  }
  
  const result = await prisma.cotSession.update({
    where: { id: sessionId },
    data: {
      status: 'PENDING',
      lastError: null,
      retryCount: 0,
      nextRetryAt: null
    }
  })
  
  console.log(`セッション ${sessionId} の状態をリセットしました`)
  console.log(`現在: Phase ${result.currentPhase} - ${result.currentStep}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
