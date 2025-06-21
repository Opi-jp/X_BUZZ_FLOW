import { format, toZonedTime } from 'date-fns-tz'
import { ja } from 'date-fns/locale/ja'

// 日本のタイムゾーン
const JST_TIMEZONE = 'Asia/Tokyo'

/**
 * DateをJSTに変換
 */
export function toJST(date: Date | string | number): Date {
  const d = new Date(date)
  return toZonedTime(d, JST_TIMEZONE)
}

/**
 * JSTで現在時刻を取得
 */
export function nowJST(): Date {
  return toZonedTime(new Date(), JST_TIMEZONE)
}

/**
 * JSTで日付をフォーマット
 */
export function formatJST(
  date: Date | string | number,
  formatStr: string = 'yyyy年MM月dd日 HH:mm:ss'
): string {
  const jstDate = toJST(date)
  return format(jstDate, formatStr, { locale: ja, timeZone: JST_TIMEZONE })
}

/**
 * よく使うフォーマットのプリセット
 */
export const formatPresets = {
  // 日付のみ
  date: (date: Date | string | number) => formatJST(date, 'yyyy年MM月dd日'),
  
  // 時刻のみ
  time: (date: Date | string | number) => formatJST(date, 'HH:mm:ss'),
  
  // 日付と時刻
  datetime: (date: Date | string | number) => formatJST(date, 'yyyy年MM月dd日 HH:mm'),
  
  // 詳細な日時
  full: (date: Date | string | number) => formatJST(date, 'yyyy年MM月dd日(E) HH:mm:ss'),
  
  // 短い日付
  short: (date: Date | string | number) => formatJST(date, 'MM/dd HH:mm'),
  
  // Twitter用（投稿時刻表示）
  twitter: (date: Date | string | number) => {
    const now = nowJST()
    const target = toJST(date)
    const diff = now.getTime() - target.getTime()
    
    // 1分未満
    if (diff < 60 * 1000) {
      return 'たった今'
    }
    // 1時間未満
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}分前`
    }
    // 24時間未満
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}時間前`
    }
    // 7日未満
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days}日前`
    }
    // それ以上
    return formatJST(date, 'yyyy年MM月dd日')
  }
}

// JST時刻フォーマット用の関数のみ提供
// React Hookは別ファイルで実装