/**
 * ラップ関数の出力確認
 * 2025-06-19
 */

// ラップ関数を直接インポート（generateCharacterContentV2から抽出）
import { CharacterProfile } from '../types/character'

// キャラクター設定をラップする関数（コピー）
function wrapCharacterProfile(character: CharacterProfile): string {
  const parts: string[] = []
  
  // 基本情報
  parts.push(`${character.name}、${character.age}歳の${character.gender === 'male' ? '男性' : character.gender === 'female' ? '女性' : '人物'}。`)
  
  // 背景
  if (character.background) {
    parts.push(character.background + '。')
  }
  
  // 特徴
  if (character.features && character.features.length > 0) {
    parts.push(character.features.join('。') + '。')
  }
  
  // トーン
  if (character.tone) {
    parts.push(character.tone + '。')
  }
  
  // 語り口
  if (character.voice_style) {
    if (character.voice_style.normal) {
      parts.push(character.voice_style.normal)
    }
    if (character.voice_style.humorous) {
      parts.push(character.voice_style.humorous)
    }
  }
  
  // 哲学
  if (character.philosophy) {
    parts.push(`信条：「${character.philosophy}」`)
  }
  
  return parts.join('\n\n')
}

// コンセプトデータをラップする関数（コピー）
function wrapConceptData(concept: any, topicInfo?: any): string {
  const parts: string[] = []
  
  // トピック情報
  if (topicInfo?.title || concept.topicTitle) {
    parts.push(`トピック: ${topicInfo?.title || concept.topicTitle}`)
  }
  
  // フック
  if (concept.structure?.openingHook || concept.hook) {
    parts.push(`フック: ${concept.structure?.openingHook || concept.hook}`)
  }
  
  // 構造がある場合
  if (concept.structure) {
    if (concept.structure.background) {
      parts.push(`背景: ${concept.structure.background}`)
    }
    if (concept.structure.mainContent) {
      parts.push(`メインコンテンツ: ${concept.structure.mainContent}`)
    }
    if (concept.structure.reflection) {
      parts.push(`内省: ${concept.structure.reflection}`)
    }
    if (concept.structure.cta) {
      parts.push(`CTA: ${concept.structure.cta}`)
    }
  }
  
  // バイラルスコア
  if (concept.viralScore) {
    parts.push(`バイラルスコア: ${concept.viralScore}/100`)
  }
  
  // ハッシュタグ（参考情報として）
  if (concept.hashtags && concept.hashtags.length > 0) {
    parts.push(`推奨ハッシュタグ: ${concept.hashtags.join(', ')}`)
  }
  
  return parts.join('\n\n')
}

// ダミーデータ
const character: CharacterProfile = {
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

const topicInfo = {
  title: 'AIツール導入で人間の働き方が激変',
  url: 'https://example.com/ai-work-change'
}

// 出力確認
console.log('=== キャラクターデータ（ラップ後） ===')
console.log(wrapCharacterProfile(character))
console.log('\n' + '='.repeat(50) + '\n')

console.log('=== コンセプトデータ（ラップ後） ===')
console.log(wrapConceptData(concept, topicInfo))
console.log('\n' + '='.repeat(50) + '\n')

// プロンプトに埋め込まれる想定の完成形
console.log('=== 完成したプロンプト（想定） ===')
const promptTemplate = `あなたはバズる投稿の専門家です。

【キャラクターデータ】
${wrapCharacterProfile(character)}

【前工程から渡されたコンセプト】
${wrapConceptData(concept, topicInfo)}

上記のキャラクターの人格で、コンセプトに基づいたTwitter投稿を作成してください。

要件：
- 120-135文字で印象的な一言
- ハッシュタグは不要、本文のみ
- キャラクターの個性を最大限に活かす`

console.log(promptTemplate)