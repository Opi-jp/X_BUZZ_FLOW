import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// あなたの独自視点パターン
const INSIGHT_PATTERNS = [
  {
    id: 'creative-ai-paradox',
    name: 'クリエイティブ×AI逆説',
    description: 'AIの効率化に対して、あえて非効率の価値を説く',
    triggers: ['AI', '効率化', '自動化', '最適化'],
    counterNarrative: ['手作業の価値', '非効率の美学', 'アナログ回帰', '人間性'],
    personalContext: ['23年の映像制作経験', 'プロジェクションマッピング', 'NAKED創業']
  },
  {
    id: 'future-past-bridge',
    name: '未来×過去架橋論',
    description: '最新技術と過去の経験を意外に結びつける',
    triggers: ['最新', '革新', 'GPT-4', 'Claude', '破壊的'],
    counterNarrative: ['歴史は繰り返す', '1990年代のデジャヴ', 'CG黎明期との類似'],
    personalContext: ['1990年代CG業界', 'インターネット普及期の体験', '技術変革の目撃者']
  },
  {
    id: 'age-advantage-theory',
    name: '50代逆転優位論',
    description: '若者優位の時代に、経験者の独自価値を主張',
    triggers: ['Z世代', 'デジタルネイティブ', '若手', 'スキルアップ'],
    counterNarrative: ['経験の蓄積価値', '長期視点の重要性', '失敗学習の価値'],
    personalContext: ['50歳のセカンドキャリア', '業界歴23年', '複数の技術変革体験']
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      timeRange = '24h',
      sources = ['news', 'twitter'],
      personalContext = true
    } = body

    // 時間範囲の設定
    const timeAgo = timeRange === '24h' ? 24 : timeRange === '6h' ? 6 : 1
    const since = new Date(Date.now() - timeAgo * 60 * 60 * 1000)

    // データ収集
    const [newsArticles, buzzPosts] = await Promise.all([
      sources.includes('news') ? prisma.newsArticle.findMany({
        where: { publishedAt: { gte: since } },
        orderBy: { publishedAt: 'desc' },
        take: 20
      }) : [],
      
      sources.includes('twitter') ? prisma.buzzPost.findMany({
        where: { 
          postedAt: { gte: since },
          likesCount: { gte: 1000 } // 一定の注目度以上
        },
        orderBy: { likesCount: 'desc' },
        take: 30
      }) : []
    ])

    // 独自視点の発見
    const insights = []
    const rpCandidates = []

    // 1. 逆張りパターンの発見
    for (const pattern of INSIGHT_PATTERNS) {
      const matchingContent: any[] = []
      
      // ニュースから該当するトピックを探す
      newsArticles.forEach(article => {
        const content = (article.title + ' ' + article.content).toLowerCase()
        const triggerMatches = pattern.triggers.filter(trigger => 
          content.includes(trigger.toLowerCase())
        ).length
        
        if (triggerMatches > 0) {
          matchingContent.push({
            type: 'news',
            title: article.title,
            content: article.content,
            url: article.url,
            triggers: triggerMatches
          })
        }
      })

      // バズツイートから該当するトピックを探す
      buzzPosts.forEach(post => {
        const content = post.content.toLowerCase()
        const triggerMatches = pattern.triggers.filter(trigger => 
          content.includes(trigger.toLowerCase())
        ).length
        
        if (triggerMatches > 0) {
          matchingContent.push({
            type: 'twitter',
            content: post.content,
            author: post.authorUsername,
            followers: post.authorFollowers,
            url: post.url,
            triggers: triggerMatches
          })
        }
      })

      // パターンマッチした場合、逆張りインサイトを生成
      if (matchingContent.length > 0) {
        insights.push({
          pattern: pattern.name,
          description: pattern.description,
          matchingContent: matchingContent.slice(0, 3), // TOP 3
          counterNarrative: pattern.counterNarrative,
          personalHook: pattern.personalContext,
          postIdea: await generateCounterPost(pattern, matchingContent[0]),
          serendipityScore: calculateSerendipityScore(matchingContent)
        })
      }
    }

    // 2. 異質な組み合わせの発見
    const crossSourceInsights = []
    
    // ニュース×ツイートの組み合わせで意外な関連を探す
    for (const article of newsArticles.slice(0, 5)) {
      for (const post of buzzPosts.slice(0, 10)) {
        const similarity = calculateConceptualSimilarity(article.title, post.content)
        const serendipity = calculateSerendipityScore([article, post])
        
        if (similarity > 0.3 && serendipity > 0.7) {
          crossSourceInsights.push({
            type: 'cross-source',
            news: {
              title: article.title,
              summary: article.summary
            },
            tweet: {
              content: post.content.substring(0, 100),
              author: post.authorUsername
            },
            connection: await generateConnectionInsight(article, post),
            serendipityScore: serendipity
          })
        }
      }
    }

    // 3. 高価値RP候補の自動抽出
    const highValueRP = buzzPosts
      .filter(post => {
        const engagementRate = post.impressionsCount > 0 
          ? (post.likesCount + post.retweetsCount) / post.impressionsCount 
          : 0
        
        return (
          engagementRate > 0.05 && // 5%以上のエンゲージメント
          post.authorFollowers && post.authorFollowers > 100000 && // 10万フォロワー以上
          new Date(post.postedAt).getTime() > Date.now() - 6 * 60 * 60 * 1000 // 6時間以内
        )
      })
      .slice(0, 5)
      .map(post => ({
        id: post.id,
        content: post.content,
        author: post.authorUsername,
        followers: post.authorFollowers,
        engagement: post.impressionsCount > 0 
          ? ((post.likesCount + post.retweetsCount) / post.impressionsCount * 100).toFixed(1) + '%'
          : 'N/A',
        rpAngle: generateRPAngle(post.content),
        urgency: calculateUrgency(post.postedAt),
        url: post.url
      }))

    return NextResponse.json({
      success: true,
      insights: insights.sort((a, b) => b.serendipityScore - a.serendipityScore),
      crossSourceInsights: crossSourceInsights.sort((a, b) => b.serendipityScore - a.serendipityScore),
      rpCandidates: highValueRP,
      summary: {
        totalInsights: insights.length,
        crossConnections: crossSourceInsights.length,
        rpOpportunities: highValueRP.length,
        dataSource: {
          news: newsArticles.length,
          tweets: buzzPosts.length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Insight discovery error:', error)
    return NextResponse.json(
      { error: 'インサイト発見でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 逆張り投稿案の生成
async function generateCounterPost(pattern: any, content: any): Promise<string> {
  // 簡易版（後でClaude APIに置き換え）
  const templates: Record<string, string> = {
    'creative-ai-paradox': `みんなが「${content.type === 'news' ? content.title : content.content.substring(0, 50)}」で効率化と言ってるけど、23年の映像制作の経験から言うと、非効率こそがクリエイティブの源泉。手作業の「無駄」が新しい発見を生む。`,
    'future-past-bridge': `「${content.type === 'news' ? content.title : content.content.substring(0, 50)}」を見て1990年代のCG黎明期を思い出した。あの時も「人間の仕事がなくなる」と言われたが、実際は新しい職種が生まれた。歴史は繰り返すのかもしれない。`,
    'age-advantage-theory': `Z世代が「${content.type === 'news' ? content.title : content.content.substring(0, 50)}」を語っているが、50代の視点から見ると...実は長期視点こそが今重要なのでは？`
  }
  
  return templates[pattern.id] || '独自の視点で投稿案を生成中...'
}

// 概念的類似度の計算（簡易版）
function calculateConceptualSimilarity(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1)
  const keywords2 = extractKeywords(text2)
  
  const intersection = keywords1.filter(kw => keywords2.includes(kw))
  const union = [...new Set([...keywords1, ...keywords2])]
  
  return intersection.length / union.length
}

// セレンディピティスコアの計算
function calculateSerendipityScore(contents: any[]): number {
  // 異なるソース = +0.3
  // 時間的ギャップ = +0.2
  // 意外性 = +0.5
  let score = 0.1
  
  if (contents.length > 1) {
    const types = [...new Set(contents.map(c => c.type))]
    if (types.length > 1) score += 0.3
  }
  
  return Math.min(score + Math.random() * 0.5, 1) // 仮の計算
}

// キーワード抽出（簡易版）
function extractKeywords(text: string): string[] {
  const stopWords = ['の', 'に', 'は', 'を', 'が', 'と', 'で', 'から', 'まで']
  return text
    .split(/[\s\u3000\u3001\u3002\uff0c\uff0e]+/)
    .filter(word => word.length > 1 && !stopWords.includes(word))
    .slice(0, 10)
}

// 接続インサイト生成
async function generateConnectionInsight(article: any, post: any): Promise<string> {
  return `ニュース「${article.title}」とツイート「${post.content.substring(0, 30)}...」の意外な共通点を発見`
}

// RP角度の生成
function generateRPAngle(content: string): string {
  // あなたの専門性に基づくRP角度
  if (content.includes('AI') || content.includes('自動化')) {
    return '23年のクリエイティブ経験から見たAI活用の視点でRP'
  }
  if (content.includes('働き方') || content.includes('キャリア')) {
    return '50代セカンドキャリアの視点でRP'
  }
  return '独自の業界経験を活かしたRP'
}

// 緊急度の計算
function calculateUrgency(postedAt: Date): 'high' | 'medium' | 'low' {
  const hours = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60)
  if (hours < 2) return 'high'
  if (hours < 6) return 'medium'
  return 'low'
}