/**
 * データベースのexpertiseカラムをthemeにリネームするスクリプト
 */

const { PrismaClient } = require('../lib/generated/prisma')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 expertiseカラムをthemeにリネーム中...')
    
    // Raw SQLでカラムをリネーム
    await prisma.$executeRaw`
      ALTER TABLE "cot_sessions" 
      RENAME COLUMN "expertise" TO "theme";
    `
    
    console.log('✅ expertiseカラムをthemeにリネームしました')
    
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('ℹ️ expertiseカラムが存在しないか、既にthemeに変更済みです')
    } else {
      console.error('❌ エラー:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)