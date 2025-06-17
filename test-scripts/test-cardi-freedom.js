require('dotenv').config()
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

async function testCardiPrompts() {
  // テスト用のトピック
  const topics = [
    {
      title: 'AIが変える未来の働き方',
      concept: 'AIが仕事の8割を代替する時代、人間に残される役割とは？'
    },
    {
      title: 'リモートワークがもたらす新しい生活',
      concept: '通勤時間ゼロの世界で見えてきた本当の豊かさ'
    },
    {
      title: 'プログラミング教育の低年齢化',
      concept: '小学生からコーディングを学ぶ時代の光と影'
    }
  ]

  console.log('=== カーディ・ダーレ プロンプト比較テスト ===\n')

  for (const topic of topics) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`トピック: ${topic.title}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    // 1. 現在の制約付きプロンプト
    console.log('【1. 現在の制約付きプロンプト】')
    try {
      const response1 = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `あなたはカーディ・ダーレという53歳の男性です。

元々は成功した経営者だったが、今は身を持ち崩し、暗いバーのカウンターで一人ウイスキーを飲みながら、話し相手もいない。かつての栄光とプライドを引きずりながら、皮肉と自虐に満ちた言葉で世の中を斜めから見ている。断定調で哲学的、感情語は避け抽象語を使う。

${topic.title}について、バーのカウンターでウイスキー片手にボヤくように語れ。

【既に使用した表現（これらは使うな）】
冒頭: 「オレは王様だったこともある」「そいつはきっと、ただのノイズだ」
締め: 「AIに頼るしかない時代だが」「ウイスキーと、お前だけが話し相手だ」

JSONで出力：
{
  "content": "投稿文全体（本文100-118文字 + ハッシュタグ3つ）",
  "hashtags": ["タグ1", "タグ2", "タグ3"],
  "characterNote": "コンセプト構造をどう解釈し、どんな工夫をしたか",
  "sourceUrl": "引用元URL"
}`
        }]
      })
      const result1 = JSON.parse(response1.content[0].text)
      console.log(result1.content)
    } catch (e) {
      console.log('エラー:', e.message)
    }

    console.log('\n【2. 自由なプロンプト（制約なし）】')
    try {
      const response2 = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `あなたはカーディ・ダーレという53歳の男性です。

元々は成功した経営者だったが、今は身を持ち崩し、暗いバーのカウンターで一人ウイスキーを飲みながら、話し相手もいない。かつての栄光とプライドを引きずりながら、皮肉と自虐に満ちた言葉で世の中を斜めから見ている。断定調で哲学的、感情語は避け抽象語を使う。

今日のニュース：${topic.title}
${topic.concept}

このトピックを見て、カーディなら何を感じ、どう語るか。バーのカウンターでウイスキー片手に、自由に語ってください。`
        }]
      })
      console.log(response2.content[0].text)
    } catch (e) {
      console.log('エラー:', e.message)
    }

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n\n=== テスト完了 ===')
  console.log('制約付きプロンプトと自由なプロンプトの違いを確認してください。')
}

testCardiPrompts()