require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../lib/generated/prisma')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testConnection() {
  console.log('🔍 データベース接続テスト開始...\n')
  
  try {
    // 1. 基本的な接続テスト
    console.log('1️⃣ 基本接続テスト...')
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`
    console.log('✅ 接続成功！現在時刻:', result[0].current_time)
    
    // 2. テーブル一覧取得
    console.log('\n2️⃣ テーブル一覧取得...')
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `
    console.log('✅ テーブル数:', tables.length)
    tables.forEach(t => console.log('  -', t.tablename))
    
    // 3. CharacterProfileテーブルの存在確認
    console.log('\n3️⃣ CharacterProfileテーブルの確認...')
    const characterTableExists = tables.some(t => t.tablename === 'character_profiles')
    if (characterTableExists) {
      console.log('✅ CharacterProfileテーブルが存在します')
      
      // カラム情報取得
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'character_profiles'
        ORDER BY ordinal_position
      `
      console.log('  カラム数:', columns.length)
      columns.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})`)
      })
    } else {
      console.log('❌ CharacterProfileテーブルが存在しません')
    }
    
    // 4. V2Session関連テーブルの確認
    console.log('\n4️⃣ V2Session関連テーブルの確認...')
    const v2Tables = tables.filter(t => t.tablename.includes('v2'))
    if (v2Tables.length > 0) {
      console.log(`✅ V2関連テーブル数: ${v2Tables.length}`)
      v2Tables.forEach(t => console.log('  -', t.tablename))
    } else {
      console.log('❌ V2関連テーブルが見つかりません')
    }
    
    // 5. サンプルクエリ実行
    console.log('\n5️⃣ サンプルクエリ実行...')
    try {
      const userCount = await prisma.user.count()
      console.log('✅ ユーザー数:', userCount)
    } catch (e) {
      console.log('⚠️ ユーザーテーブルへのアクセスでエラー:', e.message)
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:')
    console.error('エラータイプ:', error.constructor.name)
    console.error('エラーメッセージ:', error.message)
    if (error.code) {
      console.error('エラーコード:', error.code)
    }
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 データベース接続を閉じました')
  }
}

console.log('📊 環境情報:')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '設定済み' : '未設定')
console.log('DIRECT_URL:', process.env.DIRECT_URL ? '設定済み' : '未設定')
console.log('Node.js:', process.version)
console.log('---\n')

testConnection()