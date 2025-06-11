const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const jobReplacementPresets = [
  // 職種別の代替事例
  {
    name: '営業職のAI代替事例',
    query: '(AI OR ChatGPT OR Claude) (営業 OR セールス) (代替 OR 置き換え OR 不要 OR なくなる OR 自動化)',
    theme: 'ホワイトカラー代替',
    minFaves: 100,
    language: 'ja'
  },
  {
    name: '事務職のAI自動化',
    query: '(AI OR RPA) (事務 OR 経理 OR 総務 OR 人事) (自動化 OR 効率化 OR 削減)',
    theme: 'ホワイトカラー代替',
    minFaves: 50,
    language: 'ja'
  },
  {
    name: 'マーケターのAI活用',
    query: '(ChatGPT OR Claude) (マーケティング OR 広告 OR PR) (代替 OR 活用 OR 効率化)',
    theme: 'ホワイトカラー代替',
    minFaves: 100,
    language: 'ja'
  },
  {
    name: 'コンサルタントとAI',
    query: '(AI OR ChatGPT) (コンサル OR 戦略 OR 分析) (代替 OR 協働 OR 脅威)',
    theme: 'ホワイトカラー代替',
    minFaves: 150,
    language: 'ja'
  },
  
  // 具体的な代替事例
  {
    name: 'AIに仕事を奪われた体験談',
    query: '(AI OR ChatGPT) (仕事 OR 職 OR 業務) (奪われ OR 失った OR なくなった OR 代替された)',
    theme: 'ホワイトカラー代替',
    minFaves: 200,
    language: 'ja'
  },
  {
    name: '企業のAI導入による人員削減',
    query: '(企業 OR 会社) AI導入 (人員削減 OR リストラ OR 配置転換 OR 効率化)',
    theme: 'ホワイトカラー代替',
    minFaves: 150,
    language: 'ja'
  },
  
  // 未来予測・警鐘
  {
    name: 'AIで消える職業予測',
    query: '(AI OR ChatGPT) (消える職業 OR なくなる仕事 OR 代替される職種) (10年後 OR 将来 OR 未来)',
    theme: 'ホワイトカラー代替',
    minFaves: 300,
    language: 'ja'
  },
  {
    name: 'ホワイトカラーの危機',
    query: 'ホワイトカラー (AI OR 自動化) (危機 OR 脅威 OR 代替 OR 不要)',
    theme: 'ホワイトカラー代替',
    minFaves: 100,
    language: 'ja'
  },
  
  // 対策・生き残り戦略
  {
    name: 'AI時代の生存戦略',
    query: 'AI時代 (生き残る OR 生存戦略 OR 必要なスキル OR 差別化)',
    theme: 'ホワイトカラー代替',
    minFaves: 200,
    language: 'ja'
  },
  {
    name: 'AIと共存する働き方',
    query: '(AI OR ChatGPT) (共存 OR 協働 OR 使いこなす) (働き方 OR キャリア OR スキル)',
    theme: 'ホワイトカラー代替',
    minFaves: 150,
    language: 'ja'
  },
  
  // 実例・ケーススタディ
  {
    name: 'ChatGPTで業務効率化した事例',
    query: 'ChatGPT (業務効率化 OR 生産性向上 OR 時短) (事例 OR 実例 OR 体験)',
    theme: 'ホワイトカラー代替',
    minFaves: 100,
    language: 'ja'
  },
  {
    name: 'AI導入の成功と失敗',
    query: '(企業 OR 組織) AI導入 (成功 OR 失敗 OR 課題 OR 問題)',
    theme: 'ホワイトカラー代替',
    minFaves: 80,
    language: 'ja'
  },
  
  // セカンドキャリア関連
  {
    name: '50代のAI活用術',
    query: '(50代 OR 中高年 OR シニア) (AI OR ChatGPT) (活用 OR 学習 OR キャリア)',
    theme: 'ホワイトカラー代替',
    minFaves: 50,
    language: 'ja'
  },
  {
    name: 'セカンドキャリアとAI',
    query: 'セカンドキャリア (AI OR テクノロジー) (転職 OR 独立 OR 起業)',
    theme: 'ホワイトカラー代替',
    minFaves: 30,
    language: 'ja'
  },
  
  // クリエイティブ×AI
  {
    name: 'クリエイティブ職のAI活用',
    query: '(クリエイティブ OR デザイナー OR ディレクター) (AI OR ChatGPT) (活用 OR 脅威 OR 共存)',
    theme: 'ホワイトカラー代替',
    minFaves: 100,
    language: 'ja'
  }
]

async function main() {
  try {
    console.log('Creating job replacement collection presets...')
    
    let created = 0
    let updated = 0
    
    for (const preset of jobReplacementPresets) {
      const existing = await prisma.collectionPreset.findFirst({
        where: { name: preset.name }
      })
      
      if (existing) {
        await prisma.collectionPreset.update({
          where: { id: existing.id },
          data: preset
        })
        updated++
        console.log(`Updated: ${preset.name}`)
      } else {
        await prisma.collectionPreset.create({
          data: preset
        })
        created++
        console.log(`Created: ${preset.name}`)
      }
    }
    
    console.log(`\nDone! Created: ${created}, Updated: ${updated}`)
    
    // 全プリセットを表示
    const allPresets = await prisma.collectionPreset.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\nTotal presets: ${allPresets.length}`)
    console.log('\nJob replacement presets:')
    allPresets
      .filter(p => p.theme === 'ホワイトカラー代替')
      .forEach(p => {
        console.log(`- ${p.name} (min_faves: ${p.minFaves})`)
      })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()