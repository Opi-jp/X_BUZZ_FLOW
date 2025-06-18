/**
 * 新しいジェネレーターとプロンプトのテスト
 * 2025-06-19
 */

const { generateCharacterContentV2 } = require('../lib/character-content-generator-v2.ts')

// ダミーのキャラクターデータ（character.tsから）
const character = {
  id: 'cardi-dare',
  name: 'カーディ・ダーレ',
  age: 53,
  gender: 'male',
  tone: '皮肉屋で饒舌、自嘲気味なユーモア、どこか諦念をまとっている',
  catchphrase: '酒とタバコと機械学習',
  philosophy: '人間は最適化できない。それが救いだ。',
  voice_style: {
    normal: '饒舌で余白のある語り。皮肉と自虐を交えた大人の語り口。',
    emotional: '誰にも信じてもらえなかった頃の痛みを引きずりながら、それでも語り続ける。',
    humorous: '比喩や例え話を好み、感情や状況を独特の言い回しで描写。一見軽口でも、どこか余韻を残す。'
  },
  features: [
    '煙草と酒が手放せない',
    'ハードボイルドな外見と所作',
    '古いロボットとつるんでいる',
    '過去に"信じさせた嘘"が世界を変えた',
    'AIと機械学習には巻き込まれる形で関わっている'
  ],
  background: '元詐欺師／元王様（いまはただの飲んだくれ）'
}

// ダミーのコンセプトデータ（GPTから渡されるもの）
const concept = {
  topicTitle: 'AIが仕事を奪うという恐怖の裏で、実は人間が仕事から逃げ始めている',
  structure: {
    openingHook: '「AIに仕事を奪われる」と怯える奴らに言いたい。違う、お前らが仕事から逃げてるんだ。',
    background: '最新の調査で、AIツール導入企業の8割で「人間側が積極的に単純作業を手放している」ことが判明',
    mainContent: 'AIは道具だ。だが人間は、その道具に責任を押し付けることで、自分の怠惰を正当化し始めた。',
    reflection: '俺も昔、詐欺で世界を変えた。嘘は時に真実より強い。今、AIという「嘘」に、みんな喜んで騙されてる。',
    cta: 'で、お前はどっちだ？AIに奪われる側か、それとも逃げる側か？'
  },
  hashtags: ['AI時代の本音', '仕事の未来', '人間の言い訳'],
  viralScore: 85
}

// ダミーのトピック情報
const topicInfo = {
  title: 'AIツール導入で人間の働き方が激変',
  url: 'https://example.com/ai-work-change'
}

// テスト実行
async function test() {
  console.log('=== 新しいジェネレーターのテスト ===\n')
  
  try {
    // シンプル版のテスト
    console.log('【シンプル版】')
    const simpleResult = await generateCharacterContentV2({
      character,
      concept,
      topicInfo,
      format: 'simple'
    })
    
    console.log('生成された投稿:')
    console.log(simpleResult.posts[0])
    console.log(`\n文字数: ${simpleResult.posts[0].length}`)
    console.log('---\n')
    
    // スレッド版のテスト
    console.log('【スレッド版】')
    const threadResult = await generateCharacterContentV2({
      character,
      concept,
      topicInfo,
      format: 'thread'
    })
    
    console.log('生成されたスレッド:')
    threadResult.posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post}`)
      console.log(`   文字数: ${post.length}\n`)
    })
    
  } catch (error) {
    console.error('エラー:', error)
  }
}

// 実行
test()