#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function fixColumns() {
  console.log('🔧 usersテーブルのカラム名を修正中...');
  
  try {
    // 1. 既存のcamelCaseカラムを削除
    console.log('  1. 既存のcamelCaseカラムを削除...');
    try {
      await prisma.$executeRaw`ALTER TABLE users DROP COLUMN IF EXISTS "createdAt"`;
      await prisma.$executeRaw`ALTER TABLE users DROP COLUMN IF EXISTS "updatedAt"`;
      console.log('     ✅ 完了');
    } catch (e) {
      console.log('     ⚠️  スキップ:', e.message);
    }
    
    // 2. snake_caseからcamelCaseにリネーム
    console.log('  2. created_at → createdAt にリネーム...');
    try {
      await prisma.$executeRaw`ALTER TABLE users RENAME COLUMN created_at TO "createdAt"`;
      console.log('     ✅ 完了');
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log('     ⚠️  created_atカラムが存在しません。新規作成します...');
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
        console.log('     ✅ 作成完了');
      } else {
        throw e;
      }
    }
    
    console.log('  3. updated_at → updatedAt にリネーム...');
    try {
      await prisma.$executeRaw`ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt"`;
      console.log('     ✅ 完了');
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log('     ⚠️  updated_atカラムが存在しません。新規作成します...');
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
        console.log('     ✅ 作成完了');
      } else {
        throw e;
      }
    }
    
    // 3. デフォルト値設定
    console.log('  4. デフォルト値を設定...');
    await prisma.$executeRaw`ALTER TABLE users ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`;
    console.log('     ✅ 完了');
    
    // 4. トリガー作成
    console.log('  5. 自動更新トリガーを作成...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;
    
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS update_users_updated_at ON users`;
    await prisma.$executeRaw`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `;
    console.log('     ✅ 完了');
    
    // 5. 確認
    console.log('\n📊 最終確認...');
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('createdAt', 'updatedAt', 'created_at', 'updated_at')
      ORDER BY column_name
    `;
    
    console.log('   現在のカラム:');
    columns.forEach(col => {
      console.log(`     - ${col.column_name}`);
    });
    
    console.log('\n✅ カラム名の修正が完了しました！');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
fixColumns();