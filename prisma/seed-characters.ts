import { PrismaClient } from '../lib/generated/prisma'
import { DEFAULT_CHARACTERS } from '../types/character'

const prisma = new PrismaClient()

async function seedCharacters() {
  console.log('🎭 キャラクタープロファイルのシードデータを作成中...')
  
  try {
    // 既存のデフォルトキャラクターを削除
    await prisma.characterProfile.deleteMany({
      where: { isDefault: true }
    })
    
    // デフォルトキャラクターを作成
    for (const character of DEFAULT_CHARACTERS) {
      const { id, createdAt, updatedAt, userId, ...characterData } = character
      
      const created = await prisma.characterProfile.create({
        data: {
          ...characterData,
          voiceStyle: character.voice_style,
          visual: character.visual || {},
          isDefault: true
        }
      })
      
      console.log(`✅ キャラクター作成: ${created.name} (${created.id})`)
    }
    
    console.log('\n🎉 キャラクタープロファイルのシードデータ作成完了！')
    
    // 作成されたキャラクターを確認
    const characters = await prisma.characterProfile.findMany({
      where: { isDefault: true }
    })
    
    console.log('\n📋 作成されたキャラクター一覧:')
    characters.forEach(char => {
      console.log(`- ${char.name} (${char.age}歳, ${char.gender})`)
      console.log(`  キャッチフレーズ: ${char.catchphrase}`)
      console.log(`  哲学: ${char.philosophy || 'なし'}`)
    })
    
  } catch (error) {
    console.error('❌ シードデータ作成エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 直接実行された場合
if (require.main === module) {
  seedCharacters()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

export { seedCharacters }