#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function cleanupColumns() {
  console.log('🧹 重複カラムのクリーンアップ...');
  
  try {
    // 1. 重複カラムのデータを確認
    console.log('\n1️⃣ 重複カラムのデータを確認...');
    const duplicateCheck = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT created_at) as distinct_created_at,
        COUNT(DISTINCT "createdAt") as distinct_createdAt,
        COUNT(DISTINCT updated_at) as distinct_updated_at,
        COUNT(DISTINCT "updatedAt") as distinct_updatedAt,
        COUNT(*) as total_records
      FROM users
    `;
    console.log('   データ状況:', duplicateCheck[0]);
    
    // 2. 古いカラムのデータを新しいカラムにコピー（必要な場合）
    console.log('\n2️⃣ データの同期...');
    
    // createdAtにデータをコピー
    await prisma.$executeRaw`
      UPDATE users 
      SET "createdAt" = COALESCE("createdAt", created_at, CURRENT_TIMESTAMP)
      WHERE "createdAt" IS NULL
    `;
    console.log('   ✅ createdAtのデータ同期完了');
    
    // updatedAtにデータをコピー
    await prisma.$executeRaw`
      UPDATE users 
      SET "updatedAt" = COALESCE("updatedAt", updated_at, CURRENT_TIMESTAMP)
      WHERE "updatedAt" IS NULL
    `;
    console.log('   ✅ updatedAtのデータ同期完了');
    
    // 3. 古いカラムを削除
    console.log('\n3️⃣ 古いカラムを削除...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE users DROP COLUMN IF EXISTS created_at`;
      console.log('   ✅ created_at削除完了');
    } catch (e) {
      console.log('   ⚠️  created_at削除エラー:', e.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE users DROP COLUMN IF EXISTS updated_at`;
      console.log('   ✅ updated_at削除完了');
    } catch (e) {
      console.log('   ⚠️  updated_at削除エラー:', e.message);
    }
    
    // 4. 最終確認
    console.log('\n4️⃣ 最終確認...');
    const finalColumns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('createdAt', 'updatedAt', 'created_at', 'updated_at')
      ORDER BY column_name
    `;
    
    console.log('   残っているカラム:');
    finalColumns.forEach(col => {
      const icon = col.column_name.includes('_') ? '❌' : '✅';
      console.log(`     ${icon} ${col.column_name} (${col.data_type})`);
    });
    
    // 5. ユーザーデータの確認
    console.log('\n5️⃣ ユーザーデータの確認...');
    const userCount = await prisma.user.count();
    const sampleUser = await prisma.user.findFirst();
    
    console.log(`   ユーザー数: ${userCount}`);
    if (sampleUser) {
      console.log('   サンプルユーザー:');
      console.log(`     - ID: ${sampleUser.id}`);
      console.log(`     - Username: ${sampleUser.username}`);
      console.log(`     - CreatedAt: ${sampleUser.createdAt}`);
      console.log(`     - UpdatedAt: ${sampleUser.updatedAt}`);
    }
    
    console.log('\n✅ クリーンアップ完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
cleanupColumns();