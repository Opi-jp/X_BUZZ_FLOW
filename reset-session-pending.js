const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function resetStatus() {
  const sessionId = '3abdb3e4-9031-4f5b-9419-845fb93a80ed';
  
  await prisma.cotSession.update({
    where: { id: sessionId },
    data: {
      status: 'PENDING',
      lastError: null
    }
  });
  
  console.log('Session status reset to PENDING');
  await prisma.$disconnect();
}

resetStatus();