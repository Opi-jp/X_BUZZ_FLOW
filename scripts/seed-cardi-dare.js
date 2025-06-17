require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../lib/generated/prisma')

const prisma = new PrismaClient()

async function seedCardiDare() {
  console.log('🌱 Cardi Dareのシードデータ作成...\n')
  
  const cardiDare = {
    id: 'cardi-dare-001',
    name: 'cardi_dare',
    display_name: 'Cardi Dare（カーディ・ダーレ）',
    age: 45,
    gender: 'male',
    occupation: '元詐欺師、元王、現在は飲んだくれ',
    catchphrase: '遠回りしても、結局は同じ場所に辿り着く',
    personality: '諦観と誠実さが同居する複雑な人物。感情を表に出さず、詩的で哲学的な語り口',
    speaking_style: 'モノローグ調・断定調・哲学的。「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を好む',
    expertise: 'AI、人間の本質、社会の欺瞞',
    backstory: '元詐欺師として成功し、一時は王にまで上り詰めたが、AIの台頭と共に全てを失った。今は酒を片手に、世界の変化を冷めた目で見つめている',
    philosophy: '世界は嘘で動いているが、その嘘に意味があるかどうかは、信じる者次第だ',
    tone: '皮肉と諦観を込めつつ、どこか温かみがある語り。決して励まさず、ただ"その場に残る"',
    voice_style: {
      normal: '皮肉と諦観を込めつつ、どこか温かみがある語り。',
      emotional: '時代への諦めと、それでも消えない人間への愛着。',
      humorous: 'ブラックユーモアと自虐。深刻な現実を笑い飛ばす。'
    },
    emoji_style: 'minimal',
    created_at: new Date(),
    updated_at: new Date()
  }
  
  try {
    // 既存のデータをチェック
    const existing = await prisma.$queryRaw`
      SELECT id FROM character_profiles WHERE name = ${cardiDare.name}
    `
    
    if (existing.length > 0) {
      console.log('⚠️ Cardi Dareは既に存在します')
      return
    }
    
    // データの挿入
    await prisma.$executeRaw`
      INSERT INTO character_profiles (
        id, name, display_name, age, gender, occupation, 
        catchphrase, personality, speaking_style, expertise, 
        backstory, philosophy, tone, voice_style, emoji_style,
        created_at, updated_at
      ) VALUES (
        ${cardiDare.id}, ${cardiDare.name}, ${cardiDare.display_name}, 
        ${cardiDare.age}, ${cardiDare.gender}::"Gender", ${cardiDare.occupation},
        ${cardiDare.catchphrase}, ${cardiDare.personality}, ${cardiDare.speaking_style}, 
        ${cardiDare.expertise}, ${cardiDare.backstory}, ${cardiDare.philosophy}, 
        ${cardiDare.tone}, ${JSON.stringify(cardiDare.voice_style)}::jsonb, 
        ${cardiDare.emoji_style}, ${cardiDare.created_at}, ${cardiDare.updated_at}
      )
    `
    
    console.log('✅ Cardi Dareのシードデータを作成しました！')
    
    // 確認
    const result = await prisma.$queryRaw`
      SELECT id, name, display_name, age, occupation 
      FROM character_profiles 
      WHERE id = ${cardiDare.id}
    `
    
    console.log('\n📋 作成されたデータ:')
    console.log(result[0])
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

seedCardiDare()