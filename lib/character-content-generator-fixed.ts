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

export async function generateCharacterContentFixed({
  character,
  concept,
  voiceMode = 'normal',
  topicInfo
}: GenerateContentParams) {
  
  const systemPrompt = `あなたは${character.name}という${character.age}歳の${character.gender}です。

【性格と背景】
${character.tone}

【人生哲学・世界観】
${character.philosophy || '特になし'}

【文体の特徴】
${character.voice_style[voiceMode] || character.voice_style.normal}

重要：「${character.catchphrase}」の直接使用は避け、その精神を文章に込める。`

  const userPrompt = `以下のコンテンツを作成してください。

【トピック】
${topicInfo?.title || concept.topicTitle || 'AIと働き方'}

【コンセプト】
${JSON.stringify(concept.structure || concept, null, 2)}

【厳密な要件】
1. 本文を書く
2. ハッシュタグを2個追加（#○○ 形式）
3. 本文＋ハッシュタグの合計が135-140文字
4. 最後にスペースを入れてURL追加: ${topicInfo?.url || 'https://example.com'}
5. 全体の構成: 本文＋ハッシュタグ（135-140文字）＋スペース＋URL

【出力例（137文字＋URL）】
AIが同僚になる時代がついに来たか。深夜、データの海に溺れながら思う。機械は疲れを知らないが、人間は夜更けの静寂に意味を見出す。煙る思考の向こうに新しい働き方が見える。時代の流れに身を任せるしかないのだろうな。#AI共存 #働き方改革 https://example.com

JSON形式で出力：
{
  "content": "本文＋ハッシュタグ＋URL（全て含む完成形）",
  "hashtags": ["タグ1", "タグ2"],
  "textLength": 本文＋ハッシュタグの文字数（URL除く）,
  "characterNote": "キャラクター表現の説明"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
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
        try {
          result = JSON.parse(jsonMatch[0])
        } catch (e2) {
          console.error('JSONパースエラー:', e2)
          throw new Error('Failed to parse Claude response')
        }
      }
    }

    // 実際の文字数を確認
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length

    return {
      content: result.content,
      hashtags: result.hashtags || [],
      characterNote: result.characterNote,
      actualLength,
      reportedLength: result.textLength,
      rawResponse: content
    }
    
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}