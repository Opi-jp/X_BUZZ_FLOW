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
        philosophy: character.philosophy || character.tone,
        topicTitle: topicInfo?.title || concept.topicTitle,
        openingHook: concept.structure?.openingHook || concept.hook
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
        
        const mainPost = mainResponse.content[0].text.trim()
        
        // ハッシュタグを追加（140文字以内に収める）
        const hashtags = concept.hashtags || []
        const hashtagsStr = hashtags.length > 0 ? ` ${hashtags.map(h => `#${h}`).join(' ')}` : ''
        
        // 文字数調整（140文字を超える場合は本文を短縮）
        let mainPostWithTags = mainPost + hashtagsStr
        if (mainPostWithTags.length > 140) {
          const overLength = mainPostWithTags.length - 140
          const trimmedPost = mainPost.substring(0, mainPost.length - overLength - 3) + '...'
          mainPostWithTags = trimmedPost + hashtagsStr
        }
        
        return {
          mainPost: mainPostWithTags,
          replyPost: `出典：${concept.topicUrl || topicInfo?.url || ''}`,
          hashtags: hashtags,
          format: 'simple',
          characterNote: 'カーディ・ダーレの2連投稿（メイン140文字＋出典ツリー）'
        }
      } catch (error) {
        console.error('Claude API error:', error)
        throw error
      }
    } else {
      // スレッド形式（5段階の物語構造）
      const threadPrompt = loadPrompt('claude/character-profiles/cardi-dare-thread.txt', {
        philosophy: character.philosophy || character.tone,
        topicTitle: topicInfo?.title || concept.topicTitle,
        openingHook: concept.structure?.openingHook || concept.hook,
        background: concept.structure?.background || '',
        mainContent: concept.structure?.mainContent || '',
        reflection: concept.structure?.reflection || '',
        cta: concept.structure?.cta || ''
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
        
        const content = threadResponse.content[0].text.trim()
        
        // 5つの投稿に分割（番号や区切りで分ける）
        const posts = content.split(/\n\n/).filter(p => p.trim())
          .map(p => p.replace(/^[1-5]\.\s*/, '').trim())
          .slice(0, 5)
        
        // ハッシュタグは最初の投稿にのみ追加
        const hashtags = concept.hashtags || []
        const hashtagsStr = hashtags.length > 0 ? ` ${hashtags.map(h => `#${h}`).join(' ')}` : ''
        
        return {
          threadPosts: [
            posts[0] + hashtagsStr,
            ...posts.slice(1)
          ],
          sourcePost: `出典：${concept.topicUrl || topicInfo?.url || ''}`,
          hashtags: hashtags,
          format: 'thread',
          characterNote: 'カーディ・ダーレのスレッド形式（5段階の物語構造＋出典）'
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

    const content = response.content[0].text.trim()
    
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