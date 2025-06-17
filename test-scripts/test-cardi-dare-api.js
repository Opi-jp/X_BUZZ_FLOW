require('dotenv').config({ path: '.env.local' })
const { generateCharacterContent } = require('../lib/character-content-generator')
const { DEFAULT_CHARACTERS } = require('../types/character')

async function testCardiDareAPI() {
  console.log('🥃 カーディ・ダーレ API実装テスト\n')
  
  // カーディ・ダーレを取得
  const cardiDare = DEFAULT_CHARACTERS.find(c => c.id === 'cardi_dare')
  if (!cardiDare) {
    console.error('❌ カーディ・ダーレが見つかりません')
    return
  }
  
  console.log(`キャラクター: ${cardiDare.name}`)
  console.log(`キャッチフレーズ: ${cardiDare.catchphrase}`)
  console.log('='.repeat(60))
  
  // テスト用のコンセプト（V2形式）
  const testConcepts = [
    {
      conceptId: 'test1',
      topicTitle: 'AIが職場で同僚になる2025年',
      hookType: '意外性（Surprise）',
      angle: '個人的なつながりの物語',
      structure: {
        openingHook: 'AIと一緒に働いて気づいた意外な真実を問いかける',
        background: '多くの人がAI導入に不安を感じている現状を指摘',
        mainContent: 'AI同僚との実体験から得た予想外の発見を共有',
        reflection: '人間とAIの協働が生む新しい価値について内省',
        cta: '読者に自分のAI体験を共有してもらう'
      }
    },
    {
      conceptId: 'test2',
      topicTitle: '生成AIバブルの真実',
      hookType: '緊急性（Urgency）',
      angle: '反対派は世論に異議を唱える',
      structure: {
        openingHook: '今すぐ知るべき生成AIバブルの裏側を提示',
        background: '誰もが生成AIに熱狂している中での違和感',
        mainContent: 'バブルの崩壊パターンと今回の類似点を分析',
        reflection: '過去の失敗から学ぶべき教訓を振り返る',
        cta: '冷静な視点を持つことの重要性を訴える'
      }
    },
    {
      conceptId: 'test3',
      topicTitle: 'プロンプトエンジニアリングの未来',
      hookType: '自己投影（Identity）',
      angle: '専門家による内部視点の分析',
      structure: {
        openingHook: 'プロンプトエンジニアとしての自分の立場から問いかけ',
        background: 'この職業が一時的なものか永続的なものかの議論',
        mainContent: '実際の現場から見たプロンプトエンジニアリングの本質',
        reflection: '技術の進化と人間の役割の変化について考察',
        cta: 'この分野に興味がある人へのアドバイスを求める'
      }
    }
  ]
  
  const voiceModes = ['normal', 'emotional', 'humorous']
  
  for (const concept of testConcepts) {
    console.log(`\n📌 ${concept.topicTitle}`)
    console.log(`フック: ${concept.hookType} | 角度: ${concept.angle}`)
    console.log('-'.repeat(60))
    
    // 各ボイスモードでテスト
    for (const mode of voiceModes) {
      console.log(`\n【${mode}モード】`)
      
      try {
        const result = await generateCharacterContent({
          character: cardiDare,
          concept,
          voiceMode: mode,
          topicInfo: {
            title: concept.topicTitle,
            url: 'https://example.com'
          }
        })
        
        console.log('―'.repeat(50))
        console.log(result.content)
        console.log('―'.repeat(50))
        console.log(`ハッシュタグ: ${result.hashtags.join(' ')}`)
        console.log(`補足: ${result.characterNote}`)
        
        // 文字数チェック
        const mainText = result.content.split('#')[0].trim()
        console.log(`文字数: ${mainText.length}文字`)
        
      } catch (error) {
        console.error('生成エラー:', error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ テスト完了')
}

// テスト実行
testCardiDareAPI().catch(console.error)