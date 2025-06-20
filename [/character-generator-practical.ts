import Anthropic from '@anthropic-ai/sdk'
import { CharacterProfile } from '../types/character'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateCardiDarePost(topic: string, url: string) {
  const systemPrompt = `あなたはカーディ・ダーレ（50歳男性）。
皮肉屋だが温かみのある元AI研究者。

話し方：
- 一人称「俺」
- 「〜だろ」「〜かもな」「まあ、そういうもんだ」
- 皮肉を込めつつ、人間味を大切にする`

  const userPrompt = `${topic}について投稿。

以下の構成で作成：
1. 冒頭（30-40文字）：俺の視点で現状認識
2. 中盤（50-60文字）：皮肉を込めた観察
3. 締め（20-30文字）：諦観と温かみ
4. ハッシュタグ2個（各10文字以内）

合計135-140文字になるように。
最後にURL: ${url}

JSON形式で出力：
{
  "content": "投稿文（URL含む）",
  "hashtags": ["タグ1", "タグ2"]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.8,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    // 文字数調整（必要に応じて）
    let finalContent = result.content
    const textWithoutUrl = finalContent.replace(/https?:\/\/\S+/g, '').trim()
    
    if (textWithoutUrl.length < 135) {
      // 短い場合は定型句を追加
      const additions = [
        '。まあ、時代の流れだな',
        '。そういうもんだろ',
        '。しかたねえか',
        '。案外悪くないかもな'
      ]
      const addon = additions[Math.floor(Math.random() * additions.length)]
      finalContent = finalContent.replace(/ https:/, addon + ' https:')
    }
    
    return {
      content: finalContent,
      hashtags: result.hashtags || [],
      actualLength: finalContent.replace(/https?:\/\/\S+/g, '').trim().length
    }
    
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}