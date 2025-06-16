const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkTask() {
  const taskId = 'f55283c8-ff15-4797-a596-75f7acc2adfc';
  
  const task = await prisma.asyncApiTask.findUnique({
    where: { id: taskId }
  });
  
  console.log('Task details:');
  console.log('- ID:', task?.id);
  console.log('- Status:', task?.status);
  console.log('- Type:', task?.type);
  console.log('- Phase:', task?.phaseNumber);
  console.log('- Step:', task?.stepName);
  console.log('- Created at:', task?.createdAt);
  
  // Check all pending tasks
  const pendingTasks = await prisma.asyncApiTask.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('\nAll pending tasks:', pendingTasks.length);
  pendingTasks.forEach(t => {
    console.log(`- ${t.id}: ${t.type} (Phase ${t.phaseNumber}, Step ${t.stepName})`);
  });
  
  await prisma.$disconnect();
}

checkTask().catch(console.error);