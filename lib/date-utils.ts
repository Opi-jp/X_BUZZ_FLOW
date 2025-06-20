import { format, formatDistanceToNow, parseISO, isValid, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'

/**
 * 日付をフォーマット
 */
export function formatDate(date: Date | string, formatStr: string = 'yyyy/MM/dd HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '無効な日付'
  return format(d, formatStr, { locale: ja })
}

/**
 * 相対的な時間表示（例: 3分前）
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '無効な日付'
  return formatDistanceToNow(d, { addSuffix: true, locale: ja })
}

/**
 * 日付の妥当性をチェック
 */
export function isValidDate(date: any): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d)
}

/**
 * ISO文字列を日付に変換
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * 日本時間でフォーマット
 */
export function formatDateTimeJST(
  date: Date | string | null,
  formatStr: string = 'yyyy/MM/dd HH:mm'
): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  
  const jstDate = toZonedTime(d, 'Asia/Tokyo')
  return format(jstDate, formatStr, { locale: ja })
}

/**
 * KaitoAPI用のsinceパラメータを生成
 */
export function getKaitoSinceParam(days: number = 7): string {
  const date = subDays(new Date(), days)
  return format(date, 'yyyy-MM-dd')
}

/**
 * 日付範囲をDB用に取得
 */
export function getDateRangeForDB(days: number = 7): { start: Date; end: Date } {
  const end = new Date()
  const start = subDays(end, days)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}