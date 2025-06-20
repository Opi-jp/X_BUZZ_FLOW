/**
 * 統一コンテンツ生成システム
 * 3ステップ実装: Perplexity → GPT → Claude
 */

import { OpenAI } from 'openai'
import { searchWithContext } from '@/lib/perplexity'
import { generateWithClaude } from '@/lib/claude'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface GenerationConfig {
  theme: string      // 発信したい分野
  style: string      // コンテンツのスタイル
  platform: string   // プラットフォーム
  character?: string // キャラクター（オプション）
}

export interface GenerationResult {
  step: string
  status: 'success' | 'error'
  data: any
  nextStep?: string
}

/**
 * Step 1: Perplexity - トレンド収集
 * 最新のトレンドと関連情報を収集
 */
export async function step1_collectTrends(config: GenerationConfig): Promise<GenerationResult> {
  try {
    console.log('[Step 1] Perplexity: トレンド収集開始')
    
    // 検索クエリを生成
    const searchQueries = [
      `${config.theme}の最新トレンドとニュース 2025年`,
      `${config.theme}で話題になっている議論や論争`,
      `${config.theme}の未来予測と専門家の意見`,
      `${config.theme}の成功事例と失敗事例`
    ]
    
    // Perplexityで検索実行
    const searchResults = await Promise.all(
      searchQueries.map(query => 
        searchWithContext({
          query,
          context: `${config.platform}でバズる可能性が高い${config.theme}のトピックを探しています`
        })
      )
    )
    
    // 結果を整理
    const trends = searchResults.map((result, index) => ({
      query: searchQueries[index],
      findings: result.answer || result,
      sources: result.sources || []
    }))
    
    return {
      step: 'perplexity',
      status: 'success',
      data: { trends },
      nextStep: 'gpt'
    }
  } catch (error) {
    console.error('[Step 1] Error:', error)
    return {
      step: 'perplexity',
      status: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * Step 2: GPT - コンセプト生成
 * トレンドを分析し、バイラルコンテンツのコンセプトを生成
 */
export async function step2_generateConcepts(
  config: GenerationConfig, 
  trendsData: any
): Promise<GenerationResult> {
  try {
    console.log('[Step 2] GPT: コンセプト生成開始')
    
    const systemPrompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。`
    
    const userPrompt = `
# ユーザー設定
* 発信したい分野: ${config.theme}
* コンテンツのスタイル: ${config.style}
* プラットフォーム: ${config.platform}

# 収集されたトレンド情報
${JSON.stringify(trendsData.trends, null, 2)}

# タスク
上記のトレンド情報を分析し、バイラルの可能性が高い3つのコンテンツコンセプトを生成してください。

各コンセプトは以下の形式で出力してください：

{
  "concepts": [
    {
      "id": 1,
      "topic": "トレンドトピック",
      "format": "スレッド/単一投稿/カルーセル",
      "hook": "注目を集める具体的なオープナー",
      "angle": "独自の視点や見方",
      "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
      "sourceUrl": "参考にしたソースURL"
    }
  ]
}

重要：
- 物語性のある魅力的なコンセプトを作成
- 読者の感情を動かす角度を選択
- ${config.platform}に最適化された形式を選択`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
    
    const concepts = JSON.parse(response.choices[0].message.content || '{}')
    
    return {
      step: 'gpt',
      status: 'success',
      data: concepts,
      nextStep: 'claude'
    }
  } catch (error) {
    console.error('[Step 2] Error:', error)
    return {
      step: 'gpt',
      status: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * Step 3: Claude - キャラクター音声での仕上げ
 * 生成されたコンセプトをキャラクターの声で最終コンテンツ化
 */
export async function step3_finalizeWithCharacter(
  config: GenerationConfig,
  concepts: any,
  character?: string
): Promise<GenerationResult> {
  try {
    console.log('[Step 3] Claude: キャラクター音声での仕上げ開始')
    
    // デフォルトキャラクター（Cardi Dare）の定義
    const characterVoice = character || `
名前: Cardi Dare
性格: 大胆で挑発的、本音で語る
口調: カジュアルだが洞察的、時に皮肉も交える
特徴: 
- 常識に疑問を投げかける
- 本質を突く鋭い視点
- 読者を行動に駆り立てる`

    const results = await Promise.all(
      concepts.concepts.map(async (concept: any) => {
        const prompt = `
あなたは${characterVoice}というキャラクターです。

以下のコンセプトを、あなたのキャラクターボイスで${config.platform}用の投稿として完成させてください：

コンセプト:
- トピック: ${concept.topic}
- フック: ${concept.hook}
- 角度: ${concept.angle}
- キーポイント: ${concept.keyPoints.join(', ')}

要件:
- ${config.platform}の文字数制限に収める
- キャラクターの個性を全面に出す
- 読者の感情を動かし、行動を促す
- 適切な絵文字とハッシュタグを含める

出力形式:
{
  "content": "完成した投稿文",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "characterNote": "キャラクターとして意識した点"
}`

        const result = await generateWithClaude(prompt)
        return {
          conceptId: concept.id,
          original: concept,
          final: JSON.parse(result)
        }
      })
    )
    
    return {
      step: 'claude',
      status: 'success',
      data: { 
        finalContents: results,
        character: characterVoice
      }
    }
  } catch (error) {
    console.error('[Step 3] Error:', error)
    return {
      step: 'claude',
      status: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * 統合実行関数
 * 3ステップを順番に実行
 */
export async function generateViralContent(config: GenerationConfig): Promise<{
  success: boolean
  results: GenerationResult[]
  finalContents?: any[]
  error?: string
}> {
  const results: GenerationResult[] = []
  
  try {
    // Step 1: Perplexity
    const step1Result = await step1_collectTrends(config)
    results.push(step1Result)
    
    if (step1Result.status === 'error') {
      throw new Error('Step 1 failed: ' + step1Result.data.error)
    }
    
    // Step 2: GPT
    const step2Result = await step2_generateConcepts(config, step1Result.data)
    results.push(step2Result)
    
    if (step2Result.status === 'error') {
      throw new Error('Step 2 failed: ' + step2Result.data.error)
    }
    
    // Step 3: Claude
    const step3Result = await step3_finalizeWithCharacter(
      config, 
      step2Result.data,
      config.character
    )
    results.push(step3Result)
    
    if (step3Result.status === 'error') {
      throw new Error('Step 3 failed: ' + step3Result.data.error)
    }
    
    return {
      success: true,
      results,
      finalContents: step3Result.data.finalContents
    }
  } catch (error) {
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}