const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const presets = await prisma.collectionPreset.findMany({
    where: { isActive: true },
    select: { 
      name: true, 
      query: true, 
      minLikes: true, 
      minRetweets: true, 
      category: true,
      keywords: true
    }
  });
  console.log('Current active presets:');
  console.log(JSON.stringify(presets, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);