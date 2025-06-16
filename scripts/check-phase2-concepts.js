#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkConcepts(sessionId) {
  try {
    const phase2 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 2
        }
      }
    });

    if (phase2?.integrateResult?.concepts) {
      console.log('\n=== Phase 2 コンセプト詳細 ===\n');
      
      phase2.integrateResult.concepts.forEach((concept, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 コンセプト ${index + 1}: ${concept.title}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\nA（形式）: ${concept.A}`);
        console.log(`\nB（フック）: ${concept.B}`);
        console.log(`\nC（角度/独自の視点）: ${concept.C}`);
        console.log(`\nD（キーポイント）:`);
        if (concept.D && Array.isArray(concept.D)) {
          concept.D.forEach((point, i) => {
            console.log(`  ${i + 1}. ${point}`);
          });
        }
        console.log(`\n基となった機会: ${concept.opportunity}`);
        console.log(`ニュースソース: ${concept.newsSource}`);
        console.log(`URL: ${concept.sourceUrl}`);
        console.log('\n');
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2] || 'a5f3dff1-1954-4db0-a50b-48750603f569';
checkConcepts(sessionId);