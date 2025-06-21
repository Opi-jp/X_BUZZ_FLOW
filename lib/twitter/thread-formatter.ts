/**
 * スレッド形式のフォーマッター
 * Twitter Blueの長文投稿でも視覚的に分離されるようにフォーマット
 */

export interface ThreadFormatterOptions {
  addNumbers?: boolean      // 投稿番号を追加
  addSeparators?: boolean   // 区切り線を追加
  addTimestamp?: boolean    // タイムスタンプを追加
}

/**
 * スレッド用にコンテンツをフォーマット
 */
export function formatThreadContent(
  tweets: string[],
  options: ThreadFormatterOptions = {}
): string[] {
  const {
    addNumbers = true,
    addSeparators = true,
    addTimestamp = false
  } = options
  
  return tweets.map((tweet, index) => {
    let formatted = ''
    
    // 最初の投稿以外に番号を追加
    if (addNumbers && index > 0) {
      formatted += `[${index + 1}/${tweets.length}]\n\n`
    }
    
    // 区切り線を追加（最初の投稿以外）
    if (addSeparators && index > 0) {
      formatted += '―――――――――――――\n\n'
    }
    
    // 本文を追加
    formatted += tweet
    
    // タイムスタンプを追加（デバッグ用）
    if (addTimestamp) {
      formatted += `\n\n⏰ ${new Date().toISOString().substring(11, 19)}`
    }
    
    return formatted
  })
}

/**
 * スレッドの開始と終了を明示的にマーク
 */
export function markThreadBoundaries(tweets: string[]): string[] {
  if (tweets.length === 0) return tweets
  
  const marked = [...tweets]
  
  // 最初の投稿に開始マークを追加
  marked[0] = `【スレッド 1/${tweets.length}】\n\n${marked[0]}`
  
  // 最後の投稿に終了マークを追加
  if (tweets.length > 1) {
    const lastIndex = marked.length - 1
    marked[lastIndex] = `${marked[lastIndex]}\n\n【スレッド終了 ${tweets.length}/${tweets.length}】`
  }
  
  return marked
}

/**
 * 各投稿を280文字以内に収める（URLは23文字として計算）
 */
export function ensureTweetLength(tweet: string, maxLength: number = 280): string {
  // URLの数を数える
  const urlPattern = /https?:\/\/[^\s]+/g
  const urls: string[] = tweet.match(urlPattern) || []
  const urlCount = urls.length
  
  // URLを考慮した実際の長さを計算（各URLは23文字として計算）
  let effectiveLength = tweet.length
  urls.forEach((url: string) => {
    effectiveLength = effectiveLength - url.length + 23
  })
  
  // 長さが制限内ならそのまま返す
  if (effectiveLength <= maxLength) {
    return tweet
  }
  
  // 制限を超える場合は短縮
  const overLength = effectiveLength - maxLength
  const ellipsis = '...'
  
  // URLを除いた部分から削る
  let shortened = tweet.substring(0, tweet.length - overLength - ellipsis.length) + ellipsis
  
  return shortened
}

/**
 * スレッド投稿用に最適化
 */
export function optimizeForThread(tweets: string[]): string[] {
  // 各投稿の長さを確保
  const lengthOptimized = tweets.map(tweet => ensureTweetLength(tweet))
  
  // スレッドの境界をマーク
  const marked = markThreadBoundaries(lengthOptimized)
  
  // 番号と区切りを追加
  const formatted = formatThreadContent(marked, {
    addNumbers: false,  // markThreadBoundariesで番号を付けているため
    addSeparators: true
  })
  
  return formatted
}