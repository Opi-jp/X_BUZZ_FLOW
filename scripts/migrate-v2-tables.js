require('dotenv').config()
const { PrismaClient } = require('../lib/generated/prisma')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function runMigration() {
  console.log('🚀 V2テーブルのマイグレーションを開始します...')
  
  try {
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_viral_v2_tables.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // SQLを個別のステートメントに分割
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📋 ${statements.length}個のSQLステートメントを実行します`)
    
    // 各ステートメントを実行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`\n実行中 (${i + 1}/${statements.length}):`)
      console.log(statement.substring(0, 50) + '...')
      
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log('✅ 成功')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⚠️  既に存在します（スキップ）')
        } else {
          throw error
        }
      }
    }
    
    // テーブルの存在確認
    console.log('\n📊 テーブルの存在確認...')
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('viral_sessions', 'viral_drafts_v2', 'viral_draft_performance')
      ORDER BY table_name
    `
    
    console.log('✅ 作成されたテーブル:')
    tables.forEach(t => console.log(`  - ${t.table_name}`))
    
    // 各テーブルのカラム情報を表示
    for (const table of tables) {
      console.log(`\n📌 ${table.table_name} のカラム:`)
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table.table_name}
        ORDER BY ordinal_position
      `
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`)
      })
    }
    
    console.log('\n✅ マイグレーションが完了しました！')
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
runMigration().catch(error => {
  console.error(error)
  process.exit(1)
})