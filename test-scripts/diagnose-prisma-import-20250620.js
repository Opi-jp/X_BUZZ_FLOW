#!/usr/bin/env node

/**
 * Prismaインポート問題の診断スクリプト
 * 日付: 2025-06-20
 * 問題: /api/create/flow/startでprismaがundefinedになる
 */

console.log('=== Prisma Import Diagnosis ===\n');

// 1. 直接インポートのテスト
console.log('1. Direct import test:');
try {
  const { prisma } = await import('../lib/prisma.js');
  console.log('✅ Direct import successful');
  console.log('   Type:', typeof prisma);
  console.log('   Has viralSession:', !!prisma?.viralSession);
  
  // 実際のDB接続テスト
  const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
  console.log('✅ Database query successful:', testQuery);
} catch (error) {
  console.error('❌ Direct import failed:', error.message);
}

console.log('\n2. Module resolution test:');
try {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  
  const prismaPath = path.resolve(__dirname, '../lib/prisma.js');
  console.log('   Resolved path:', prismaPath);
  
  const fs = await import('fs');
  const exists = fs.existsSync(prismaPath);
  console.log('   File exists:', exists);
  
  if (!exists) {
    // TypeScriptファイルを確認
    const tsPath = path.resolve(__dirname, '../lib/prisma.ts');
    console.log('   TypeScript file exists:', fs.existsSync(tsPath));
  }
} catch (error) {
  console.error('❌ Module resolution failed:', error.message);
}

console.log('\n3. Environment check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('   DIRECT_URL:', process.env.DIRECT_URL ? 'Set' : 'Not set');

console.log('\n4. Next.js runtime simulation:');
try {
  // Next.jsのようなCommonJS/ESM混在環境での動作をシミュレート
  const module = await import('../lib/prisma.js');
  console.log('   Module keys:', Object.keys(module));
  console.log('   Has default export:', 'default' in module);
  console.log('   Has named export "prisma":', 'prisma' in module);
  
  if ('default' in module) {
    console.log('   Default export type:', typeof module.default);
    console.log('   Default export has prisma:', 'prisma' in module.default);
  }
} catch (error) {
  console.error('❌ Runtime simulation failed:', error.message);
}

console.log('\n5. TypeScript compilation check:');
try {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const { stdout, stderr } = await execAsync('npx tsc --noEmit lib/prisma.ts');
  if (stderr) {
    console.error('❌ TypeScript compilation errors:', stderr);
  } else {
    console.log('✅ TypeScript compilation successful');
  }
} catch (error) {
  console.error('❌ TypeScript check failed:', error.message);
}

console.log('\n=== Diagnosis Complete ===');