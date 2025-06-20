import Anthropic from '@anthropic-ai/sdk'
import { CharacterProfile } from '../types/character'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateNaturalCharacterPost({
  character,
  topic,
  url,
  isHumorous = false
}: {
  character: CharacterProfile
  topic: string
  url: string
  isHumorous?: boolean
}) {
  
  // 自然な会話形式のプロンプト
  const prompt = `
あなたは${character.name}という${character.age}歳の${character.gender === 'male' ? '男性' : '女性'}です。

${character.philosophy}

今日は「${topic}」についてTwitterに投稿しようと思います。
あなたらしい視点で、140文字程度（URLは別）で投稿を書いてください。

${isHumorous ? 'いつもより少しユーモラスに、自虐的なジョークも交えて。' : ''}

投稿の最後には必ず ${url} を付けてください。
ハッシュタグも2つほど付けてください。

あなたらしい一人称で語ってください。
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = response.content[0].text || ''
    
    // シンプルに投稿文を抽出（JSONパース不要）
    // ハッシュタグも含まれているはず
    const post = content.trim()
    
    // URLが含まれていない場合は追加
    if (!post.includes(url)) {
      return post + ' ' + url
    }
    
    return post
    
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}