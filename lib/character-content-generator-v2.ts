import Anthropic from '@anthropic-ai/sdk'
import { CharacterProfile, VoiceStyleMode } from '../types/character'
import { loadPrompt } from './prompt-loader'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
})

interface GenerateContentParams {
  character: CharacterProfile
  concept: any
  voiceMode?: VoiceStyleMode
  topicInfo?: {
    title: string
    url: string
  }
  format?: 'simple' | 'thread' // simple=2連投稿、thread=スレッド形式
}

// キャラクター設定をラップする関数
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

// コンセプトデータをラップする関数
function wrapConceptData(concept: any, topicInfo?: any): string {
  const parts: string[] = []
  
  // トピック
  parts.push(`●トピック: ${topicInfo?.title || concept.topicTitle || concept.conceptTitle}`)
  
  // フックタイプとアングル（重要な創作指示）
  if (concept.hookType) {
    parts.push(`\n●フックタイプ: ${concept.hookType}`)
  }
  if (concept.angle) {
    parts.push(`●アングル: ${concept.angle}`)
  }
  if (concept.angleRationale) {
    parts.push(`●アングルの理由: ${concept.angleRationale}`)
  }
  
  // フック
  if (concept.structure?.openingHook || concept.hook) {
    parts.push(`\n●フック: ${concept.structure?.openingHook || concept.hook}`)
  }
  
  // 物語構造
  if (concept.structure) {
    parts.push('\n投稿案の構成には、下記の物語構造を使ってください：')
    
    if (concept.structure.background) {
      parts.push(`1. 背景: ${concept.structure.background}`)
    }
    if (concept.structure.mainContent) {
      parts.push(`2. メインコンテンツ: ${concept.structure.mainContent}`)
    }
    if (concept.structure.reflection) {
      parts.push(`3. 内省: ${concept.structure.reflection}`)
    }
    if (concept.structure.cta) {
      parts.push(`4. CTA: ${concept.structure.cta}`)
    }
  }
  
  // バイラル要因は参考情報として（オプション）
  if (concept.viralFactors && concept.viralFactors.length > 0) {
    parts.push(`\n参考：バイラル要因 - ${concept.viralFactors.join('、')}`)
  }
  
  // ハッシュタグはClaudeには渡さない（投稿システム側で追加するため）
  
  return parts.join('\n')
}

export async function generateCharacterContentV2({
  character,
  concept,
  voiceMode = 'normal',
  topicInfo,
  format = 'simple'
}: GenerateContentParams) {
  const isCardiDare = character.id === 'cardi-dare'
  
  if (isCardiDare) {
    if (format === 'simple') {
      // シンプルな2連投稿
      const mainPostPrompt = loadPrompt('claude/character-profiles/cardi-dare-simple.txt', {
        character: wrapCharacterProfile(character),
        concept: wrapConceptData(concept, topicInfo)
      })

      try {
        const mainResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          temperature: 0.8,
          messages: [
            {
              role: 'user',
              content: mainPostPrompt
            }
          ]
        })
        
        const mainContentBlock = mainResponse.content[0]
        const mainPost = mainContentBlock.type === 'text' ? mainContentBlock.text.trim() : ''
        
        // ハッシュタグを追加（140文字以内に収める）
        const hashtags = concept.hashtags || []
        const hashtagsStr = hashtags.length > 0 ? ` ${hashtags.map((h: string) => `#${h}`).join(' ')}` : ''
        
        // 文字数調整（140文字を超える場合は本文を短縮）
        let mainPostWithTags = mainPost + hashtagsStr
        if (mainPostWithTags.length > 140) {
          const overLength = mainPostWithTags.length - 140
          const trimmedPost = mainPost.substring(0, mainPost.length - overLength - 3) + '...'
          mainPostWithTags = trimmedPost + hashtagsStr
        }
        
        return {
          posts: [mainPostWithTags],
          hashtags: hashtags,
          format: 'simple',
          characterNote: 'カーディ・ダーレの投稿（シンプル版）',
          sourceUrl: concept.topicUrl || topicInfo?.url || ''
        }
      } catch (error) {
        console.error('Claude API error:', error)
        throw error
      }
    } else {
      // スレッド形式（5段階の物語構造）
      const threadPrompt = loadPrompt('claude/character-profiles/cardi-dare-thread.txt', {
        character: wrapCharacterProfile(character),
        concept: wrapConceptData(concept, topicInfo)
      })

      try {
        const threadResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          temperature: 0.8,
          messages: [
            {
              role: 'user',
              content: threadPrompt
            }
          ]
        })
        
        const threadContentBlock = threadResponse.content[0]
        const content = threadContentBlock.type === 'text' ? threadContentBlock.text.trim() : ''
        
        // JSON形式のレスポンスをパース
        let postsData: { post1: string; post2: string; post3: string; post4: string; post5: string }
        try {
          postsData = JSON.parse(content)
        } catch (e) {
          console.error('Failed to parse thread JSON:', e)
          throw new Error('Invalid JSON response from Claude')
        }
        
        // 5つの投稿を配列に変換
        const posts = [
          postsData.post1,
          postsData.post2,
          postsData.post3,
          postsData.post4,
          postsData.post5
        ].filter(p => p && p.trim())
        
        // ハッシュタグは最初の投稿にのみ追加
        const hashtags = concept.hashtags || []
        const hashtagsStr = hashtags.length > 0 ? ` ${hashtags.map((h: string) => `#${h}`).join(' ')}` : ''
        
        return {
          posts: [
            posts[0] + hashtagsStr,
            ...posts.slice(1)
          ],
          hashtags: hashtags,
          format: 'thread',
          characterNote: 'カーディ・ダーレの投稿（スレッド版）',
          sourceUrl: concept.topicUrl || topicInfo?.url || ''
        }
      } catch (error) {
        console.error('Claude API error:', error)
        throw error
      }
    }
  }
    
  
  // 他のキャラクターは従来通り
  let voiceModeInstruction = ''
  if (voiceMode === 'humorous') {
    voiceModeInstruction = '今日は少しユーモラスに、自虐的なジョークも交えて語ってください。'
  } else if (voiceMode === 'emotional') {
    voiceModeInstruction = '今日は感情的に、熱く語ってください。'
  }

  const systemPrompt = loadPrompt('claude/character-default.txt', {
    characterName: character.name,
    characterAge: character.age,
    characterGender: character.gender === 'male' ? '男性' : character.gender === 'female' ? '女性' : '人物',
    characterPhilosophy: character.philosophy || character.tone,
    voiceModeInstruction,
    topicTitle: topicInfo?.title || concept.topicTitle,
    conceptStructure: JSON.stringify(concept.structure || concept, null, 2)
  })

  const userPrompt = '上記の指示に従って投稿を作成してください。'

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const contentBlock = response.content[0]
    const content = contentBlock.type === 'text' ? contentBlock.text.trim() : ''
    
    return {
      content: content,
      hashtags: concept.hashtags || [],
      sourceUrl: concept.topicUrl || topicInfo?.url || '',
      characterNote: `${character.name}として表現`
    }
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}

// バッチ生成（複数のコンセプトを一度に処理）
export async function generateCharacterContentBatchV2({
  character,
  concepts,
  voiceMode = 'normal',
  topicInfo,
  format = 'simple'
}: {
  character: CharacterProfile
  concepts: any[]
  voiceMode?: VoiceStyleMode
  topicInfo?: {
    title: string
    url: string
  }
  format?: 'simple' | 'thread'
}) {
  const results = []
  
  for (const concept of concepts) {
    try {
      const result = await generateCharacterContentV2({
        character,
        concept,
        voiceMode,
        topicInfo,
        format
      })
      
      results.push({
        conceptId: concept.conceptId,
        ...result
      })
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`コンセプト ${concept.conceptId} の生成に失敗:`, error)
      results.push({
        conceptId: concept.conceptId,
        error: error.message
      })
    }
  }
  
  return results
}