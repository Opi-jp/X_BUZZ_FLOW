// 専門分野に基づく動的カテゴリ生成
export interface SearchCategory {
  name: string
  keywords: string[]
  searchQueries: string[]
}

export function generateSearchCategories(expertise: string): SearchCategory[] {
  // 基本カテゴリ（すべての分野で共通）
  const baseCategories: SearchCategory[] = [
    {
      name: '最新ニュースとトレンド',
      keywords: ['latest', 'news', 'breaking', '最新', 'ニュース', '速報'],
      searchQueries: []
    },
    {
      name: '有名人・話題の人物',
      keywords: ['celebrity', '有名人', '話題', 'influencer'],
      searchQueries: []
    },
    {
      name: '政治・政策動向',
      keywords: ['politics', 'policy', '政治', '政策', '規制'],
      searchQueries: []
    },
    {
      name: 'ビジネス・企業動向',
      keywords: ['business', 'company', '企業', 'ビジネス', 'スタートアップ'],
      searchQueries: []
    },
    {
      name: '文化・社会現象',
      keywords: ['culture', 'social', '文化', '社会', 'トレンド'],
      searchQueries: []
    }
  ]

  // 専門分野のキーワード抽出
  const expertiseKeywords = extractKeywords(expertise)
  
  // 各カテゴリに専門分野を組み合わせた検索クエリを生成
  return baseCategories.map(category => ({
    ...category,
    searchQueries: generateQueriesForCategory(category, expertiseKeywords, expertise)
  }))
}

function extractKeywords(expertise: string): string[] {
  // 専門分野から主要キーワードを抽出
  const keywords: string[] = []
  
  // 日本語の形態素解析（簡易版）
  // 実際の実装では、より高度な形態素解析ライブラリを使用
  const patterns = [
    /AI|人工知能/g,
    /働き方|ワーク|労働/g,
    /クリエイティブ|創造|デザイン/g,
    /テクノロジー|技術|テック/g,
    /ビジネス|経営|起業/g,
    /教育|学習|スキル/g,
    /健康|ヘルス|医療/g,
    /環境|サステナビリティ|SDGs/g
  ]
  
  patterns.forEach(pattern => {
    const matches = expertise.match(pattern)
    if (matches) {
      keywords.push(...matches)
    }
  })
  
  // expertise全体も追加
  keywords.push(expertise)
  
  return [...new Set(keywords)] // 重複を除去
}

function generateQueriesForCategory(
  category: SearchCategory,
  expertiseKeywords: string[],
  fullExpertise: string
): string[] {
  const queries: string[] = []
  const today = new Date()
  const monthYear = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]
  
  // 基本的な検索クエリパターン
  expertiseKeywords.forEach(keyword => {
    // 時間指定付きクエリ
    queries.push(`${keyword} ${category.keywords[0]} latest after:${weekAgoStr}`)
    queries.push(`${keyword} ${category.keywords[0]} ${monthYear}`)
    
    // カテゴリキーワードとの組み合わせ
    category.keywords.forEach(catKeyword => {
      queries.push(`"${keyword}" "${catKeyword}" newest`)
    })
  })
  
  // 専門分野全体でのクエリ
  queries.push(`"${fullExpertise}" ${category.keywords[0]} past week`)
  
  return queries.slice(0, 3) // 各カテゴリ最大3クエリに制限
}

// 使用例
export function getSearchPrompt(expertise: string): string {
  const categories = generateSearchCategories(expertise)
  
  return `
現在の日付: ${new Date().toLocaleDateString('ja-JP')}
専門分野: ${expertise}

以下のカテゴリと検索クエリを使用して、最新の関連記事を検索してください：

${categories.map((cat, i) => `
${i + 1}. **${cat.name}**
   検索クエリ:
${cat.searchQueries.map(q => `   - "${q}"`).join('\n')}
`).join('\n')}

各カテゴリから1-2件、合計10-15件の記事を収集してください。
`
}