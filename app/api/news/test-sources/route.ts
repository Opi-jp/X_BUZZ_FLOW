import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: テスト用のニュースソース作成
export async function GET(request: NextRequest) {
  try {
    // テスト用のニュース記事を作成
    const testSource = await prisma.newsSource.upsert({
      where: { url: 'https://test.example.com' },
      update: {},
      create: {
        name: 'Test Source',
        url: 'https://test.example.com',
        type: 'TEST',
        category: 'AI',
        active: true,
      }
    })

    // テスト記事を作成
    const testArticles = [
      {
        title: 'OpenAI、新しいGPT-5モデルを発表',
        summary: 'OpenAIは本日、次世代の大規模言語モデルGPT-5を発表しました。このモデルは従来のGPT-4と比較して2倍の性能向上を実現しています。',
        content: 'OpenAIは本日、次世代の大規模言語モデルGPT-5を発表しました。このモデルは従来のGPT-4と比較して2倍の性能向上を実現し、より自然な対話と高度な推論能力を持つとされています。',
        importance: 0.9,
      },
      {
        title: 'Anthropic、Claude 3の新機能を公開',
        summary: 'AnthropicはClaude 3に新しい機能を追加し、コーディング支援とデータ分析の能力を大幅に向上させました。',
        content: 'AnthropicはClaude 3に新しい機能を追加しました。特にコーディング支援とデータ分析の能力が大幅に向上し、開発者向けの新しいAPIも公開されました。',
        importance: 0.8,
      },
      {
        title: 'Google、AI研究に1000億円投資を発表',
        summary: 'Googleは今後3年間でAI研究開発に1000億円を投資することを発表しました。',
        content: 'Googleは今後3年間でAI研究開発に1000億円を投資することを発表しました。この投資は主に基礎研究と応用研究に充てられ、新しいAI技術の開発を加速させる予定です。',
        importance: 0.7,
      },
      {
        title: 'Microsoft、Azure AIサービスを拡張',
        summary: 'MicrosoftはAzure AIサービスに新しい機能を追加し、企業向けのAIソリューションを強化しました。',
        content: 'MicrosoftはAzure AIサービスに新しい機能を追加しました。これにより企業は独自のAIモデルをより簡単に構築・デプロイできるようになります。',
        importance: 0.6,
      },
      {
        title: 'AI研究者、新しい学習アルゴリズムを提案',
        summary: 'MIT研究チームが、より効率的な機械学習アルゴリズムを開発しました。',
        content: 'MITの研究チームが、従来の10分の1の計算リソースで同等の性能を実現する新しい機械学習アルゴリズムを開発しました。',
        importance: 0.5,
      }
    ]

    let savedCount = 0
    for (const article of testArticles) {
      try {
        const url = `https://test.example.com/article-${Date.now()}-${Math.random()}`
        await prisma.newsArticle.create({
          data: {
            sourceId: testSource.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            url,
            publishedAt: new Date(),
            category: 'AI',
            importance: article.importance,
            processed: true,
            metadata: {
              analysis: {
                category: 'test',
                summary: article.summary,
                japaneseSummary: article.summary,
                keyPoints: ['テストポイント1', 'テストポイント2'],
                impact: 'high',
                analyzedAt: new Date().toISOString(),
              }
            }
          }
        })
        savedCount++
      } catch (error) {
        console.error('Error creating test article:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${savedCount}件のテスト記事を作成しました`,
      sourceId: testSource.id
    })
  } catch (error) {
    console.error('Error creating test data:', error)
    return NextResponse.json(
      { error: 'Failed to create test data' },
      { status: 500 }
    )
  }
}