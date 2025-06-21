import { PrismaClient } from '../lib/generated/prisma'
import { DEFAULT_CHARACTERS } from '../types/character'
import { IDGenerator, EntityType } from '../lib/core/unified-system-manager'

const prisma = new PrismaClient()

async function seedCharacters() {
  console.log('🎭 キャラクタープロファイルのシードデータを作成中...')
  
  try {
    // 既存のキャラクターを削除（名前ベースで重複チェック）
    const existingNames = DEFAULT_CHARACTERS.map(c => c.name)
    await prisma.character_profiles.deleteMany({
      where: { 
        name: {
          in: existingNames
        }
      }
    })
    
    // デフォルトキャラクターを作成
    for (const character of DEFAULT_CHARACTERS) {
      const { id, createdAt, updatedAt, userId, isDefault, visual, features, background, ...characterData } = character
      
      const created = await prisma.character_profiles.create({
        data: {
          id: character.id || `char_${Date.now()}`,
          name: character.name,
          display_name: character.name,
          age: character.age,
          gender: character.gender,
          occupation: character.background || 'フリーランス',
          catchphrase: character.catchphrase,
          personality: character.features?.join(', ') || 'ユニークな個性',
          speaking_style: character.voice_style?.normal || '独特の語り口',
          expertise: 'AI・機械学習',
          backstory: character.background || '元詐欺師、元王様',
          philosophy: character.philosophy,
          tone: character.tone,
          voice_style: character.voice_style || {},
          emoji_style: '😏🍺🚬',
          preferred_news_categories: ['テクノロジー', 'AI'],
          news_comment_style: character.voice_style || {},
          topic_expertise: { fields: ['AI', '機械学習', '人生哲学'] }
        }
      })
      
      console.log(`✅ キャラクター作成: ${created.name} (${created.id})`)
    }
    
    console.log('\n🎉 キャラクタープロファイルのシードデータ作成完了！')
    
    // 作成されたキャラクターを確認
    const characters = await prisma.character_profiles.findMany({
      where: { 
        name: {
          in: existingNames
        }
      }
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