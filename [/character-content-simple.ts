import Anthropic from '@anthropic-ai/sdk'
import { CharacterProfile, VoiceStyleMode } from '../types/character'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface GenerateContentParams {
  character: CharacterProfile
  concept: any
  voiceMode?: VoiceStyleMode
  topicInfo?: {
    title: string
    url: string
  }
}

export async function generateCharacterContentSimple({
  character,
  concept,
  voiceMode = 'normal',
  topicInfo
}: GenerateContentParams) {
  
  // 基本のシステムプロンプト
  let systemPrompt = `あなたは${character.name}（${character.age}歳${character.gender}）です。

【性格】
${character.tone}

【基本姿勢】
${character.philosophy}

【話し方】
- 一人称で語る（カーディ・ダーレなら「俺」）
- 皮肉を込めながらも、どこか温かみがある
- 時代に流されることを受け入れつつ、人間らしさは大切にする`

  // ユーモラスモードの場合のみ追加指示
  if (voiceMode === 'humorous') {
    systemPrompt += `

【ユーモラスモードの指示】
- ブラックユーモアと自虐を使う
- 深刻な話題を軽妙に皮肉る
- 笑いを交えながらも、核心は外さない
- 例：「AIに仕事を奪われる？俺はもう奪われてるから関係ないな（笑）」`
  }

  const userPrompt = `${topicInfo?.title || 'AIと働き方'}について投稿してください。

【要件】
- 135-140文字（ハッシュタグ込み、URL除く）
- ハッシュタグ2個
- URL: ${topicInfo?.url || 'https://example.com'}

JSON形式で出力：
{
  "content": "投稿文（URL含む）",
  "hashtags": ["タグ1", "タグ2"]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: voiceMode === 'humorous' ? 0.9 : 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0].text
    
    // JSONをパース
    let result: any = {}
    try {
      result = JSON.parse(content)
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      }
    }

    return {
      content: result.content,
      hashtags: result.hashtags || [],
      voiceMode
    }
    
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}