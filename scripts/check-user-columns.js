#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function checkColumns() {
  console.log('🔍 usersテーブルの現在の状態を確認...\n');
  
  try {
    // 1. 全カラムを確認
    const allColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 全カラム一覧:');
    console.log('================');
    
    const timeColumns = [];
    allColumns.forEach(col => {
      const isTimeColumn = col.column_name.includes('created') || col.column_name.includes('updated');
      if (isTimeColumn) {
        timeColumns.push(col);
      }
      console.log(`  ${col.column_name} - ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n⏰ 時刻関連カラム:');
    console.log('==================');
    timeColumns.forEach(col => {
      const icon = col.column_name === 'createdAt' || col.column_name === 'updatedAt' ? '✅' : '❌';
      console.log(`  ${icon} ${col.column_name} - ${col.data_type}`);
    });
    
    // 2. Prismaでアクセステスト
    console.log('\n🧪 Prismaアクセステスト:');
    console.log('========================');
    
    try {
      const user = await prisma.user.findFirst();
      if (user) {
        console.log('✅ ユーザーデータ取得成功');
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Username: ${user.username}`);
        console.log(`  - CreatedAt: ${user.createdAt}`);
        console.log(`  - UpdatedAt: ${user.updatedAt}`);
      } else {
        console.log('⚠️  ユーザーデータが存在しません');
      }
    } catch (e) {
      console.log('❌ Prismaアクセスエラー:', e.message);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkColumns();