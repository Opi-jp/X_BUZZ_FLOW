// Perplexity応答をモック化してテストを高速化するユーティリティ

import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export interface MockPerplexityOptions {
  useCache?: boolean  // DBに保存された応答を使用
  sessionId?: string  // 特定セッションの応答を使用
  mockResponses?: any[] // カスタムモック応答
}

export class MockPerplexityClient {
  private options: MockPerplexityOptions
  private cachedResponses: any[] = []
  private responseIndex = 0

  constructor(options: MockPerplexityOptions = {}) {
    this.options = options
  }

  async initialize() {
    if (this.options.useCache && this.options.sessionId) {
      // DBから既存の応答を取得
      const phase = await prisma.cotPhase.findFirst({
        where: {
          sessionId: this.options.sessionId,
          phaseNumber: 1,
          executeResult: { not: null }
        }
      })
      
      // perplexityResponsesはexecuteResult内のsavedPerplexityResponsesから取得
      if (phase?.executeResult) {
        const executeResult = phase.executeResult as any
        this.cachedResponses = executeResult.savedPerplexityResponses || []
        console.log(`[MockPerplexity] Loaded ${this.cachedResponses.length} cached responses`)
      }
    } else if (this.options.mockResponses) {
      this.cachedResponses = this.options.mockResponses
    }
  }

  async searchWithContext(query: string, context: string): Promise<string> {
    console.log(`[MockPerplexity] Mock search for: "${query.substring(0, 50)}..."`);
    
    // キャッシュから応答を返す
    if (this.cachedResponses.length > 0) {
      const response = this.cachedResponses[this.responseIndex % this.cachedResponses.length]
      this.responseIndex++
      
      // 文字列またはオブジェクトの応答に対応
      return typeof response === 'string' ? response : response.response || response.analysis || JSON.stringify(response)
    }
    
    // デフォルトのモック応答
    return this.generateDefaultMockResponse(query)
  }

  private generateDefaultMockResponse(query: string): string {
    const date = new Date().toISOString().split('T')[0]
    
    return `
### 最新の動向（${date}時点）

${query}に関する最新情報：

1. **現在のトレンド**
   - 本日、業界関係者から重要な発表がありました
   - SNSでは関連ハッシュタグが急上昇中
   - 主要メディアが一斉に報道を開始

2. **感情的な反応**
   - Twitter上では賛否両論が活発に交わされています
   - 特に若年層からの関心が高まっています
   - インフルエンサーも続々と言及

3. **バイラルの可能性**
   - 過去24時間で言及数が300%増加
   - 複数のプラットフォームで同時に話題化
   - 今後48時間が拡散のピークと予想

### 関連ソース
1. [最新ニュース] 業界紙が本日報じた内容 (${date})
2. [SNS分析] Twitterトレンド1位を記録 (${date})
3. [専門家見解] 識者による緊急解説 (${date})
    `
  }
}

// 既存セッションのデータを使用してテスト環境を構築
export async function setupTestEnvironment(sourceSessionId: string): Promise<string> {
  try {
    // ソースセッションの取得
    const sourceSession = await prisma.cotSession.findUnique({
      where: { id: sourceSessionId },
      include: {
        phases: {
          where: { phaseNumber: 1 }
        }
      }
    })
    
    if (!sourceSession || sourceSession.phases.length === 0) {
      throw new Error('Source session not found or has no Phase 1 data')
    }
    
    // 新しいテストセッションを作成
    const testSession = await prisma.cotSession.create({
      data: {
        expertise: sourceSession.expertise,
        style: sourceSession.style,
        platform: sourceSession.platform,
        status: 'PENDING',
        currentPhase: 1,
        currentStep: 'THINK'
      }
    })
    
    // Phase 1のデータをコピー（Perplexity応答も含む）
    const sourcePhase = sourceSession.phases[0]
    await prisma.cotPhase.create({
      data: {
        sessionId: testSession.id,
        phaseNumber: 1,
        status: 'COMPLETED',
        thinkResult: sourcePhase.thinkResult,
        executeResult: sourcePhase.executeResult,
        integrateResult: sourcePhase.integrateResult,
        // perplexityResponses: データはexecuteResultに含まれるため削除
        thinkAt: new Date(),
        executeAt: new Date(),
        integrateAt: new Date()
      }
    })
    
    console.log(`[TestEnvironment] Created test session: ${testSession.id}`)
    console.log(`[TestEnvironment] Using cached Perplexity responses from: ${sourceSessionId}`)
    
    return testSession.id
    
  } catch (error) {
    console.error('[TestEnvironment] Setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 環境変数でモックモードを制御
export function shouldUseMock(): boolean {
  return process.env.USE_PERPLEXITY_MOCK === 'true' || 
         process.env.NODE_ENV === 'test' ||
         process.env.SKIP_PERPLEXITY === 'true'
}