#!/usr/bin/env node

/**
 * expertiseカラムをthemeにリネームするマイグレーションスクリプト
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function migrate() {
  try {
    console.log('Starting migration: expertise → theme');
    
    // カラムが存在するかチェック
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cot_sessions' 
      AND column_name IN ('expertise', 'theme')
    `;
    
    const hasExpertise = checkColumn.some(col => col.column_name === 'expertise');
    const hasTheme = checkColumn.some(col => col.column_name === 'theme');
    
    if (!hasExpertise && hasTheme) {
      console.log('✅ Migration already completed: theme column exists');
      return;
    }
    
    if (!hasExpertise && !hasTheme) {
      console.error('❌ Error: Neither expertise nor theme column exists');
      return;
    }
    
    if (hasExpertise && hasTheme) {
      console.log('⚠️  Warning: Both columns exist. Skipping migration.');
      return;
    }
    
    // マイグレーション実行
    console.log('Renaming column expertise to theme...');
    await prisma.$executeRaw`
      ALTER TABLE "cot_sessions" 
      RENAME COLUMN "expertise" TO "theme"
    `;
    
    console.log('✅ Migration completed successfully');
    
    // 確認
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cot_sessions' 
      AND column_name = 'theme'
    `;
    
    if (result.length > 0) {
      console.log('✅ Verified: theme column exists');
      
      // サンプルデータの表示
      const sessions = await prisma.cotSession.findMany({
        take: 5,
        select: {
          id: true,
          theme: true,
          createdAt: true
        }
      });
      
      console.log('\nSample sessions with theme:');
      sessions.forEach(session => {
        console.log(`- ${session.id}: ${session.theme}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
migrate().catch(console.error);