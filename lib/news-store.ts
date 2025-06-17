import { prisma } from '@/lib/prisma'

// ニュースストア - ニュース記事の管理と検索

export class NewsStore {
  // Perplexityの結果からニュース記事を抽出して保存
  static async saveFromTopics(sessionId: string, topics: any) {
    const parsed = topics.parsed || []
    const savedArticles = []

    for (const topic of parsed) {
      if (!topic.url) continue

      try {
        // URLから記事を保存または更新
        const article = await prisma.$executeRaw`
          INSERT INTO news_articles (
            id, url, title, summary, source_domain, 
            published_date, theme, keywords, session_ids
          ) VALUES (
            ${this.generateId()},
            ${topic.url},
            ${topic.TOPIC || 'No title'},
            ${topic.summary || ''},
            ${new URL(topic.url).hostname},
            ${topic.date ? new Date(topic.date) : new Date()},
            ${topics.theme || ''},
            ${topic.keyPoints || []},
            ARRAY[${sessionId}]::text[]
          )
          ON CONFLICT (url) DO UPDATE SET
            session_ids = array_append(
              COALESCE(news_articles.session_ids, ARRAY[]::text[]), 
              ${sessionId}
            ),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `

        // 追加ソースも保存
        if (topic.additionalSources) {
          for (const source of topic.additionalSources) {
            await prisma.$executeRaw`
              INSERT INTO news_articles (
                id, url, title, source_domain, 
                published_date, theme, session_ids
              ) VALUES (
                ${this.generateId()},
                ${source.url},
                ${source.title || 'No title'},
                ${new URL(source.url).hostname},
                ${source.date ? new Date(source.date) : new Date()},
                ${topics.theme || ''},
                ARRAY[${sessionId}]::text[]
              )
              ON CONFLICT (url) DO UPDATE SET
                session_ids = array_append(
                  COALESCE(news_articles.session_ids, ARRAY[]::text[]), 
                  ${sessionId}
                ),
                updated_at = CURRENT_TIMESTAMP
            `
          }
        }

        savedArticles.push(article)
      } catch (error) {
        console.error('Failed to save article:', error)
      }
    }

    return savedArticles
  }

  // ニュース記事を検索
  static async searchArticles(params: {
    theme?: string
    keyword?: string
    startDate?: Date
    endDate?: Date
    sourceDomain?: string
    limit?: number
  }) {
    const where: any = {}
    
    if (params.theme) {
      where.theme = params.theme
    }
    
    if (params.sourceDomain) {
      where.source_domain = params.sourceDomain
    }
    
    if (params.startDate || params.endDate) {
      where.published_date = {}
      if (params.startDate) where.published_date.gte = params.startDate
      if (params.endDate) where.published_date.lte = params.endDate
    }

    const articles = await prisma.$queryRaw`
      SELECT * FROM news_articles
      WHERE 1=1
      ${params.theme ? prisma.$queryRaw`AND theme = ${params.theme}` : prisma.$queryRaw``}
      ${params.keyword ? prisma.$queryRaw`AND (title ILIKE ${'%' + params.keyword + '%'} OR summary ILIKE ${'%' + params.keyword + '%'})` : prisma.$queryRaw``}
      ${params.sourceDomain ? prisma.$queryRaw`AND source_domain = ${params.sourceDomain}` : prisma.$queryRaw``}
      ${params.startDate ? prisma.$queryRaw`AND published_date >= ${params.startDate}` : prisma.$queryRaw``}
      ${params.endDate ? prisma.$queryRaw`AND published_date <= ${params.endDate}` : prisma.$queryRaw``}
      ORDER BY published_date DESC
      LIMIT ${params.limit || 50}
    `

    return articles
  }

  // テーマ別の最新ニュース
  static async getLatestByTheme(theme: string, limit: number = 10) {
    return await prisma.$queryRaw`
      SELECT * FROM news_articles
      WHERE theme = ${theme}
      ORDER BY published_date DESC
      LIMIT ${limit}
    `
  }

  // ソース別の統計
  static async getSourceStats(days: number = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    return await prisma.$queryRaw`
      SELECT 
        source_domain,
        COUNT(*) as article_count,
        COUNT(DISTINCT theme) as theme_count,
        MAX(published_date) as latest_article
      FROM news_articles
      WHERE collected_date >= ${startDate}
      GROUP BY source_domain
      ORDER BY article_count DESC
    `
  }

  // トレンド分析
  static async getTrendingTopics(days: number = 3) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    return await prisma.$queryRaw`
      SELECT 
        unnest(keywords) as keyword,
        COUNT(*) as mention_count,
        COUNT(DISTINCT source_domain) as source_diversity,
        array_agg(DISTINCT theme) as themes
      FROM news_articles
      WHERE published_date >= ${startDate}
      GROUP BY keyword
      HAVING COUNT(*) >= 3
      ORDER BY mention_count DESC
      LIMIT 20
    `
  }

  // 関連記事を探す
  static async findRelatedArticles(articleId: string, limit: number = 5) {
    // まず元記事を取得
    const article = await prisma.$queryRaw`
      SELECT * FROM news_articles WHERE id = ${articleId}
    ` as any[]
    
    if (article.length === 0) return []
    
    const original = article[0]
    
    // キーワードが重複する記事を探す
    return await prisma.$queryRaw`
      SELECT 
        a.*,
        array_length(
          array_intersect(a.keywords, ${original.keywords}), 
          1
        ) as keyword_overlap
      FROM news_articles a
      WHERE a.id != ${articleId}
        AND a.theme = ${original.theme}
        AND a.keywords && ${original.keywords}
      ORDER BY keyword_overlap DESC, a.published_date DESC
      LIMIT ${limit}
    `
  }

  private static generateId(): string {
    return `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}