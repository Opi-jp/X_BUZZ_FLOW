require('dotenv').config()
const { generateCharacterContentV2 } = require('../lib/character-content-generator-v2')
const { DEFAULT_CHARACTERS } = require('../types/character')

async function testCardiV2() {
  const cardi = DEFAULT_CHARACTERS.find(c => c.id === 'cardi-dare')
  
  if (!cardi) {
    console.error('カーディ・ダーレが見つかりません')
    return
  }

  // テスト用のコンセプト
  const testConcept = {
    conceptId: 'test1',
    topicTitle: 'AIが変える未来の働き方',
    topicUrl: 'https://example.com/ai-future-work',
    hook: 'AIが仕事の8割を代替する時代、人間に残される役割とは？',
    angle: '雇用の未来に対する哲学的考察',
    structure: {
      openingHook: 'AIが仕事の8割を代替するって聞いて、どう思う？',
      background: '専門家は2030年までに多くの職種が消えると予測',
      mainContent: 'でも人間にしかできない創造性や共感力がある',
      reflection: '変化を恐れるより、適応することが大切',
      cta: '君はどう準備している？'
    },
    hashtags: ['AI時代', '働き方革命', 'バズフロー']
  }

  console.log('=== カーディ・ダーレ V2 テスト ===\n')
  
  // 1. シンプルな2連投稿のテスト
  console.log('【1. シンプルな2連投稿】')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  try {
    const simpleResult = await generateCharacterContentV2({
      character: cardi,
      concept: testConcept,
      voiceMode: 'normal',
      format: 'simple'
    })
    
    console.log('📝 メイン投稿:')
    console.log(simpleResult.mainPost)
    console.log(`(文字数: ${simpleResult.mainPost.length})\n`)
    
    console.log('🔗 ツリー投稿:')
    console.log(simpleResult.replyPost)
    
  } catch (error) {
    console.error('エラー:', error)
  }
  
  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // 2. スレッド形式のテスト
  console.log('\n\n【2. スレッド形式（5段階の物語構造）】')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  try {
    const threadResult = await generateCharacterContentV2({
      character: cardi,
      concept: testConcept,
      voiceMode: 'normal',
      format: 'thread'
    })
    
    if (threadResult.threadPosts) {
      threadResult.threadPosts.forEach((post, idx) => {
        console.log(`📝 投稿 ${idx + 1}:`)
        console.log(post)
        console.log(`(文字数: ${post.length})\n`)
      })
      
      console.log('🔗 出典:')
      console.log(threadResult.sourcePost)
    }
    
  } catch (error) {
    console.error('エラー:', error)
  }
}

testCardiV2()