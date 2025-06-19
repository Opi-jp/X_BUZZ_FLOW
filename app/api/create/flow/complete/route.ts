import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { prisma } from '@/lib/prisma'
import { PerplexityClient } from '@/lib/perplexity'
import { OpenAI } from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Create Module - Complete Flow API
 * 
 * 責務: 完全なコンテンツ生成フロー（Perplexity→GPT→Claude）を実行
 * 
 * これは統合システム実装計画に基づく新しい実装です
 */

const CompleteFlowSchema = z.object({
  theme: z.string().min(1).max(200),
  platform: z.enum(['Twitter', 'LinkedIn', 'Instagram']).default('Twitter'),
  style: z.enum(['エンターテイメント', 'ビジネス', '教育', 'ニュース']).default('エンターテイメント'),
  characterId: z.string().default('cardi-dare'),
  autoSelectConcepts: z.boolean().default(true)
})

// APIクライアントの初期化
const perplexity = new PerplexityClient(process.env.PERPLEXITY_API_KEY || '')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { theme, platform, style, characterId, autoSelectConcepts } = CompleteFlowSchema.parse(body)
    
    // 新しいセッションを作成
    const session = await prisma.viralSession.create({
      data: {
        theme,
        platform,
        style,
        status: 'CREATED'
      }
    })
    
    console.log(`[Create/Flow/Complete] Starting flow for session ${session.id}`)
    
    // Step 1: Perplexity - トピック収集
    const topics = await collectTopics(session, theme, platform, style)
    
    // Step 2: GPT - コンセプト生成
    const concepts = await generateConcepts(session, topics, platform, style)
    
    // Step 3: 最適なコンセプトを選択
    const selectedConcepts = autoSelectConcepts 
      ? selectBestConcepts(concepts) 
      : concepts.slice(0, 3)
    
    // Step 4: Claude - キャラクターコンテンツ生成
    const contents = await generateCharacterContents(
      session,
      selectedConcepts,
      characterId,
      platform
    )
    
    // Step 5: 下書き作成
    const drafts = await createDrafts(session, contents, characterId)
    
    // セッションステータスを完了に更新
    await prisma.viralSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED' }
    })
    
    return successResponse({
      sessionId: session.id,
      theme,
      stats: {
        topicsCollected: topics.length,
        conceptsGenerated: concepts.length,
        conceptsSelected: selectedConcepts.length,
        draftsCreated: drafts.length
      },
      drafts: drafts.map(draft => ({
        id: draft.id,
        title: draft.title,
        preview: draft.content.substring(0, 100) + '...',
        characterId: draft.characterId
      })),
      nextSteps: {
        reviewDrafts: `/create/draft/list?sessionId=${session.id}`,
        publishNow: `/publish/post/now`,
        schedule: `/publish/schedule/set`
      }
    }, 'Content generation flow completed successfully')
    
  } catch (error) {
    console.error('[Create/Flow/Complete] Error:', error)
    return errorResponse(error)
  }
}

// Step 1: Perplexityでトピック収集
async function collectTopics(session: any, theme: string, platform: string, style: string) {
  console.log('[Step 1] Collecting topics with Perplexity')
  
  const promptPath = join(process.cwd(), 'lib/prompts/perplexity/collect-topics.txt')
  let promptTemplate = await readFile(promptPath, 'utf-8')
  
  // 変数を置換
  promptTemplate = promptTemplate
    .replace(/\${theme}/g, theme)
    .replace(/\${platform}/g, platform)
    .replace(/\${style}/g, style)
  
  const response = await perplexity.chat({
    model: 'sonar-pro',
    messages: [{ role: 'user', content: promptTemplate }]
  })
  
  const topicsText = response.choices[0].message.content
  
  // セッションを更新
  await prisma.viralSession.update({
    where: { id: session.id },
    data: {
      status: 'TOPICS_COLLECTED',
      topics: topicsText
    }
  })
  
  // トピックをパース（簡易版）
  const topics = parseTopics(topicsText)
  return topics
}

// Step 2: GPTでコンセプト生成
async function generateConcepts(session: any, topics: any[], platform: string, style: string) {
  console.log('[Step 2] Generating concepts with GPT')
  
  const promptPath = join(process.cwd(), 'lib/prompts/gpt/generate-concepts.txt')
  let promptTemplate = await readFile(promptPath, 'utf-8')
  
  const concepts = []
  
  for (const [index, topic] of topics.entries()) {
    // 変数を置換
    let prompt = promptTemplate
      .replace(/\${platform}/g, platform)
      .replace(/\${style}/g, style)
      .replace(/\${topicTitle}/g, topic.title)
      .replace(/\${topicSource}/g, topic.source || '')
      .replace(/\${topicDate}/g, topic.date || new Date().toISOString())
      .replace(/\${topicUrl}/g, topic.url || '')
      .replace(/\${topicSummary}/g, topic.summary || '')
      .replace(/\${topicKeyPoints}/g, topic.keyPoints?.join('\n') || '')
      .replace(/\${topicAnalysis}/g, topic.analysis || '')
      .replace(/\${topicIndex}/g, (index + 1).toString())
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    })
    
    const content = response.choices[0].message.content || ''
    const parsedConcepts = parseGPTConcepts(content)
    concepts.push(...parsedConcepts)
  }
  
  // セッションを更新
  await prisma.viralSession.update({
    where: { id: session.id },
    data: {
      status: 'CONCEPTS_GENERATED',
      concepts: JSON.stringify(concepts)
    }
  })
  
  return concepts
}

// Step 3: 最適なコンセプトを選択
function selectBestConcepts(concepts: any[]) {
  // バイラルスコアでソートして上位3つを選択
  return concepts
    .sort((a, b) => (b.viralScore || 0) - (a.viralScore || 0))
    .slice(0, 3)
}

// Step 4: Claudeでキャラクターコンテンツ生成
async function generateCharacterContents(
  session: any,
  concepts: any[],
  characterId: string,
  platform: string
) {
  console.log('[Step 4] Generating character contents with Claude')
  
  const contents = []
  
  for (const concept of concepts) {
    const characterProfile = getCharacterProfile(characterId)
    const conceptData = wrapConceptData(concept)
    
    const prompt = `${characterProfile}

以下のコンセプトに基づいて、${platform}用の投稿を作成してください。

${conceptData}

【重要な制約】
- 文字数: 120-135文字
- ハッシュタグは含めない（システムが後で追加）
- キャラクターの個性を最大限に活かす
- 物語構造を意識した投稿にする

投稿文のみを出力してください。`
    
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    })
    
    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''
    
    contents.push({
      conceptId: concept.conceptId,
      conceptTitle: concept.conceptTitle,
      content: content.trim(),
      characterId
    })
  }
  
  // セッションを更新
  await prisma.viralSession.update({
    where: { id: session.id },
    data: {
      status: 'CONTENTS_GENERATED',
      contents: JSON.stringify(contents),
      selectedConcepts: concepts
    }
  })
  
  return contents
}

// Step 5: 下書き作成
async function createDrafts(session: any, contents: any[], characterId: string) {
  const drafts = []
  
  for (const content of contents) {
    const draft = await prisma.viralDraftV2.create({
      data: {
        sessionId: session.id,
        conceptId: content.conceptId,
        title: content.conceptTitle,
        content: content.content,
        hashtags: ['AI時代', characterId === 'cardi-dare' ? 'カーディダーレ' : 'AI活用'],
        status: 'DRAFT',
        characterId: content.characterId,
        characterNote: `Generated with ${characterId} character`
      }
    })
    
    drafts.push(draft)
  }
  
  return drafts
}

// ヘルパー関数
function parseTopics(topicsText: string) {
  // 簡易的なパース（実際にはもっと複雑な処理が必要）
  const topics = []
  const topicBlocks = topicsText.split('### トピック').filter(block => block.trim())
  
  for (const block of topicBlocks.slice(0, 2)) { // 最大2トピック
    const lines = block.split('\n')
    const topic: any = {
      title: '',
      summary: '',
      keyPoints: [],
      analysis: ''
    }
    
    let currentSection = ''
    for (const line of lines) {
      if (line.includes('TOPIC')) {
        const match = line.match(/"([^"]+)"/)
        if (match) topic.title = match[1]
      } else if (line.includes('summary')) {
        currentSection = 'summary'
      } else if (line.includes('keyPoints')) {
        currentSection = 'keyPoints'
      } else if (line.includes('analysis')) {
        currentSection = 'analysis'
      } else if (line.trim()) {
        if (currentSection === 'summary') {
          topic.summary += line + ' '
        } else if (currentSection === 'keyPoints') {
          topic.keyPoints.push(line.trim())
        } else if (currentSection === 'analysis') {
          topic.analysis += line + ' '
        }
      }
    }
    
    if (topic.title) {
      topics.push(topic)
    }
  }
  
  return topics
}

function parseGPTConcepts(content: string) {
  // JSONブロックを抽出してパース
  const concepts = []
  const jsonMatches = content.match(/\{[\s\S]*?\}/g) || []
  
  for (const jsonStr of jsonMatches) {
    try {
      const concept = JSON.parse(jsonStr)
      if (concept.conceptId) {
        concepts.push(concept)
      }
    } catch (e) {
      // JSONパースエラーは無視
    }
  }
  
  return concepts
}

function getCharacterProfile(characterId: string) {
  const profiles: Record<string, string> = {
    'cardi-dare': `あなたは「カーディ・ダーレ」として投稿を作成します。

カーディ・ダーレ（53歳）
- 経歴: 元詐欺師 → 元王様 → 現在はただの飲んだくれ
- 哲学: 「人間は最適化できない。それが救いだ」
- 性格: シニカルで辛辣、しかし根は優しい。人生経験豊富
- 口調: ぶっきらぼうで皮肉っぽいが、時折優しさが滲む
- 特徴: ツイートに酒の話題がよく出る。理想主義者を小馬鹿にしつつも、その純粋さを密かに羨んでいる`,
    
    'default': `あなたはニュートラルで親しみやすいトーンで投稿を作成します。
情報を分かりやすく伝え、読者との共感を大切にしてください。`
  }
  
  return profiles[characterId] || profiles['default']
}

function wrapConceptData(concept: any) {
  return `【コンセプト】${concept.conceptTitle}

選択されたフック: ${concept.selectedHook || concept.hookType}
選択された角度: ${concept.selectedAngle || concept.angle}

物語構造:
1. オープニング: ${concept.structure?.openingHook || ''}
2. 背景: ${concept.structure?.background || ''}
3. メイン: ${concept.structure?.mainContent || ''}
4. 内省: ${concept.structure?.reflection || ''}
5. CTA: ${concept.structure?.cta || ''}

投稿形式: ${concept.format === 'thread' ? 'スレッド（複数投稿）' : '単独投稿'}
推奨ビジュアル: ${concept.visual || ''}
投稿タイミング: ${concept.timing || ''}`
}