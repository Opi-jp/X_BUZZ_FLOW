/**
 * Twitter投稿用の出典フォーマッター
 * Perplexityで収集した情報源をTwitter投稿用にフォーマット
 */

import { prisma } from '@/lib/prisma'

export interface SourceInfo {
  title: string
  url: string
  source: string
  date?: string
}

/**
 * セッションから出典情報を取得
 */
export async function getSourcesFromSession(
  sessionId: string
): Promise<SourceInfo[]> {
  const session = await prisma.viral_sessions.findUnique({
    where: { id: sessionId },
    select: { topics: true }
  })
  
  console.log('セッション取得:', {
    found: !!session,
    hasTopics: !!session?.topics,
    topicsType: typeof session?.topics
  })
  
  if (!session?.topics) return []
  
  const topicsText = typeof session.topics === 'string' 
    ? session.topics 
    : JSON.stringify(session.topics)
    
  return extractSourcesFromTopics(topicsText)
}

/**
 * Perplexityのtopicsテキストから出典情報を抽出
 */
function extractSourcesFromTopics(topicsText: string): SourceInfo[] {
  const sources: SourceInfo[] = []
  
  console.log('Topics テキスト（最初の500文字）:', topicsText.substring(0, 500))
  
  try {
    // まずJSONとしてパースを試みる
    const data = JSON.parse(topicsText)
    
    // topicsフィールドがある場合
    if (data.topics && Array.isArray(data.topics)) {
      for (const topic of data.topics) {
        if (topic.url && topic.title && topic.source) {
          sources.push({
            title: topic.title,
            url: topic.url,
            source: topic.source,
            date: topic.date
          })
        }
      }
    }
  } catch (e) {
    // JSONパースに失敗した場合は、JSONブロックを探す
    const jsonBlockRegex = /```\s*\n?\{[\s\S]*?\}\s*\n?```/g
    const jsonBlocks = topicsText.match(jsonBlockRegex) || []
    
    console.log('JSONブロック数:', jsonBlocks.length)
    
    for (const block of jsonBlocks) {
      try {
        // ```を除去してJSONをパース
        const jsonStr = block.replace(/```\s*\n?/g, '').trim()
        const data = JSON.parse(jsonStr)
        
        if (data.url && data.title && data.source) {
          sources.push({
            title: data.title,
            url: data.url,
            source: data.source,
            date: data.date
          })
        }
      } catch (parseError) {
        // パースエラーは無視して続行
        console.warn('Failed to parse JSON block:', parseError)
      }
    }
  }
  
  // 重複を除去して最大3つまで
  const uniqueSources = sources.filter((source, index, self) =>
    index === self.findIndex((s) => s.url === source.url)
  ).slice(0, 3)
  
  console.log('抽出された出典数:', uniqueSources.length)
  
  return uniqueSources
}

/**
 * セッションIDから出典ツイートを生成
 */
export async function formatSourceTweetFromSession(
  sessionId: string
): Promise<string | string[]> {
  const sources = await getSourcesFromSession(sessionId)
  
  if (sources.length === 0) {
    throw new Error('出典情報が見つかりません。投稿を中止します。')
  }
  
  // 出典が1つの場合は単一のツイート、複数の場合は複数のツイート
  if (sources.length === 1) {
    return formatSingleSourceTweet(sources[0])
  } else {
    return formatMultipleSourceTweets(sources)
  }
}

/**
 * 出典情報をTwitter投稿用にフォーマット
 */
export function formatSourceTweet(
  sources: SourceInfo[],
  isThread: boolean = false
): string {
  if (sources.length === 0) {
    throw new Error('出典情報が見つかりません。投稿を中止します。')
  }
  
  // スレッドの2番目の投稿であることを明示
  let tweet = "【出典情報】\n\n"
  
  sources.forEach((source, index) => {
    // ソース名と日付
    const metadata = source.date 
      ? `${source.source} (${source.date})` 
      : source.source
      
    // タイトルを短縮（必要に応じて）
    const title = source.title.length > 50 
      ? source.title.substring(0, 47) + "..." 
      : source.title
      
    tweet += `${index + 1}. ${title}\n`
    tweet += `   ${metadata}\n`
    tweet += `   ${source.url}\n`
    
    if (index < sources.length - 1) {
      tweet += "\n"
    }
  })
  
  // フッターは不要（Source Treeは出典情報のみで十分）
  // tweet += "\n💡 Perplexity AIで最新情報を分析"
  
  // 文字数チェック（URLはt.coで23文字になることを考慮）
  const estimatedLength = calculateTweetLength(tweet, sources.length)
  
  // 280文字を超える場合は短縮版
  if (estimatedLength > 280) {
    return formatShortSourceTweet(sources)
  }
  
  return tweet
}

/**
 * 短縮版の出典ツイート
 */
function formatShortSourceTweet(sources: SourceInfo[]): string {
  let tweet = "📚 出典:\n"
  
  sources.forEach((source, index) => {
    tweet += `${index + 1}. ${source.source}: ${source.url}\n`
  })
  
  // フッターは不要
  // tweet += "\n💡 Perplexity AI分析"
  
  return tweet
}

/**
 * 単一の出典情報をツイート用にフォーマット
 */
function formatSingleSourceTweet(source: SourceInfo): string {
  const metadata = source.date 
    ? `${source.source} (${source.date})` 
    : source.source
    
  return `📚 出典情報

${source.title}
${metadata}

🔗 ${source.url}

#信頼性 #ソース`
}

/**
 * 複数の出典情報を複数のツイートにフォーマット
 */
function formatMultipleSourceTweets(sources: SourceInfo[]): string[] {
  const tweets: string[] = []
  
  // 最初のツイートは導入
  tweets.push(`📚 出典情報（${sources.length}件）

以下、今回の分析で参照した情報源です。

#信頼性 #ソース`)
  
  // 各出典を個別のツイートに
  sources.forEach((source, index) => {
    const metadata = source.date 
      ? `${source.source} (${source.date})` 
      : source.source
      
    const tweet = `【出典 ${index + 1}/${sources.length}】

${source.title}
${metadata}

🔗 ${source.url}`
    
    tweets.push(tweet)
  })
  
  return tweets
}

/**
 * ツイートの推定文字数を計算（URLをt.co変換後）
 */
function calculateTweetLength(text: string, urlCount: number): number {
  // URLを除いたテキストの長さ
  const textWithoutUrls = text.replace(/https?:\/\/[^\s]+/g, '')
  // t.co変換後のURL長（1つあたり23文字）
  const urlLength = urlCount * 23
  
  return textWithoutUrls.length + urlLength
}