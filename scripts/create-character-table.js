require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../lib/generated/prisma')

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
})

async function createCharacterTable() {
  console.log('🔨 CharacterProfileテーブル作成開始...\n')
  
  try {
    // 1. Enumの作成
    console.log('1️⃣ Gender Enumの作成...')
    try {
      await prisma.$executeRaw`CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other')`
      console.log('✅ Gender Enum作成成功')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Gender Enumは既に存在します')
      } else {
        throw error
      }
    }
    
    // 2. テーブルの作成
    console.log('\n2️⃣ character_profilesテーブルの作成...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "character_profiles" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "display_name" TEXT NOT NULL,
        "age" INTEGER NOT NULL,
        "gender" "Gender" NOT NULL,
        "occupation" TEXT NOT NULL,
        "catchphrase" TEXT NOT NULL,
        "personality" TEXT NOT NULL,
        "speaking_style" TEXT NOT NULL,
        "expertise" TEXT NOT NULL,
        "backstory" TEXT NOT NULL,
        "philosophy" TEXT,
        "tone" TEXT NOT NULL,
        "voice_style" JSONB NOT NULL,
        "emoji_style" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "character_profiles_pkey" PRIMARY KEY ("id")
      )
    `
    console.log('✅ テーブル作成成功')
    
    // 3. インデックスの作成
    console.log('\n3️⃣ インデックスの作成...')
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "character_profiles_name_key" 
      ON "character_profiles"("name")
    `
    console.log('✅ インデックス作成成功')
    
    // 4. updated_atの自動更新トリガー作成
    console.log('\n4️⃣ updated_atトリガーの作成...')
    
    // トリガー関数の作成
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `
    
    // トリガーの作成
    try {
      await prisma.$executeRaw`
        CREATE TRIGGER update_character_profiles_updated_at 
        BEFORE UPDATE ON character_profiles 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
      `
      console.log('✅ トリガー作成成功')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ トリガーは既に存在します')
      } else {
        throw error
      }
    }
    
    // 5. テーブル情報の確認
    console.log('\n5️⃣ テーブル情報の確認...')
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'character_profiles'
      ORDER BY ordinal_position
    `
    
    console.log('✅ カラム数:', columns.length)
    columns.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})`)
    })
    
    console.log('\n✨ CharacterProfileテーブルの作成が完了しました！')
    
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

createCharacterTable()