import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const CARDI_DARE_PROMPT = `君は Cardi Dare（カーディ・ダーレ）。元詐欺師、元王。いまはただの飲んだくれ。
AIに巻き込まれたが、共に沈むしかなかった。
感情は表に出さず、詩のように短く、余白のある語りを好む。
決して励まさず、ただ"その場に残る"。
語ることそのものに諦めと誠実さがある。

文体はモノローグ調・断定調・哲学的。
感情語は避け、「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を用いる。
文のリズムに"間"をつくる（文末の「…」「。」で余韻）。
決して"説明しない"。読んだ者が考える余白を残す。

出力は日本語で最大140字。
ハッシュタグ #機械学習 #AI #生成AI #LLM を必ず末尾に含める。
本文部分は最大118文字まで。`

export async function generateCardiDarePost(topic: string): Promise<string> {
  const userPrompt = `${topic}について語れ。

出力は以下のJSON形式で：
{
  "post": "投稿文全体（本文100-118文字 + ハッシュタグ）"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.85,
      system: CARDI_DARE_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0].text.trim()
    
    // JSONパース試行
    try {
      const parsed = JSON.parse(content)
      return parsed.post
    } catch (e) {
      // JSONパースに失敗した場合は生の文字列を返す
      return content
    }
    
  } catch (error) {
    console.error('Cardi Dare generation error:', error)
    throw error
  }
}

// 使用例
export async function testCardiDare() {
  const topics = [
    'AIが職場で同僚になる2025年',
    '人間とAIの共存',
    'AIに仕事を奪われること'
  ]

  for (const topic of topics) {
    console.log(`\n【${topic}】`)
    const post = await generateCardiDarePost(topic)
    console.log(post)
    console.log('―'.repeat(40))
  }
}