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

export async function generateCharacterContentFinal({
  character,
  concept,
  voiceMode = 'normal',
  topicInfo
}: GenerateContentParams) {
  
  // カーディ・ダーレの場合の一人称
  const firstPerson = character.name === 'カーディ・ダーレ' ? '俺' : '私'
  
  const systemPrompt = `あなたは${character.name}です。
${character.philosophy}

【重要】
- 一人称「${firstPerson}」で語る
- 例文をそのまま使わない
- 独自の表現を創造する`

  const userPrompt = `${topicInfo?.title || 'AIと働き方'}について、あなたの視点でツイートしてください。

【コンセプト】
${concept.structure?.openingHook || ''}
${concept.structure?.mainContent || ''}

【要件】
- 約100-120文字で本文を書く
- ハッシュタグ2個（計20-30文字）を追加
- 合計で135-140文字にする
- 最後にURL: ${topicInfo?.url || 'https://example.com'}

JSON形式で出力：
{
  "content": "投稿文（URL含む）",
  "hashtags": ["タグ1", "タグ2"]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.9, // より創造的に
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

    // 実際の文字数を確認
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length

    // 文字数が合わない場合の後処理
    let finalContent = result.content
    if (actualLength < 135) {
      // 短すぎる場合は説明を追加
      const additionalText = character.name === 'カーディ・ダーレ' 
        ? '。まあ、時代の流れってやつかな'
        : '。そう思いませんか？'
      finalContent = result.content.replace(/ https:/, additionalText + ' https:')
    } else if (actualLength > 140) {
      // 長すぎる場合は削る（実装省略）
    }

    return {
      content: finalContent,
      hashtags: result.hashtags || [],
      actualLength: finalContent.replace(/https?:\/\/\S+/g, '').trim().length,
      originalLength: actualLength
    }
    
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}