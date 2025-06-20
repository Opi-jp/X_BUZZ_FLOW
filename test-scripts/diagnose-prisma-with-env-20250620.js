#!/usr/bin/env node

/**
 * Prismaインポート問題の診断スクリプト（環境変数読み込み版）
 * 日付: 2025-06-20
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

console.log('=== Prisma Import Diagnosis with ENV ===\n');

// 環境変数の確認
console.log('1. Environment check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('   DIRECT_URL:', process.env.DIRECT_URL ? 'Set' : 'Not set');

// TypeScriptファイルを直接requireする問題を調査
console.log('\n2. Import method test:');

// 方法1: 直接インポート（TypeScript）
try {
  console.log('\n   Method 1: Direct TypeScript import');
  const prismaModule = await import('../lib/prisma.ts');
  console.log('   ✅ Import successful');
  console.log('   Module keys:', Object.keys(prismaModule));
  console.log('   Has prisma export:', 'prisma' in prismaModule);
  
  if (prismaModule.prisma) {
    const testResult = await prismaModule.prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Database query successful:', testResult);
  }
} catch (error) {
  console.error('   ❌ Failed:', error.message);
}

// 方法2: tsx-loaderを使用
console.log('\n3. Next.js App Router simulation:');
try {
  // Next.jsのApp Routerでの動作を再現
  const importPath = '../lib/prisma';
  console.log('   Attempting to import:', importPath);
  
  // @/lib/prismaのパス解決をシミュレート
  const resolvedPath = resolve(__dirname, importPath);
  console.log('   Resolved to:', resolvedPath);
  
  // 動的インポートの挙動を確認
  const dynamicImport = await import(importPath);
  console.log('   Dynamic import keys:', Object.keys(dynamicImport));
} catch (error) {
  console.error('   ❌ Failed:', error.message);
}

console.log('\n=== Diagnosis Complete ===');