/**
 * 日付処理のユーティリティ関数
 * 全ての日付処理をJST（日本標準時）基準で統一
 */

/**
 * 現在のJST日時を取得
 */
export function getNowJST(): Date {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (3600000 * 9)) // UTC+9
}

/**
 * UTC日時をJST日時に変換
 */
export function toJST(date: Date | string): Date {
  const d = new Date(date)
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  return new Date(utc + (3600000 * 9))
}

/**
 * JST日時をUTC日時に変換
 */
export function toUTC(jstDate: Date): Date {
  return new Date(jstDate.getTime() - (3600000 * 9))
}

/**
 * JSTの今日の開始時刻（00:00:00）を取得
 */
export function getTodayStartJST(): Date {
  const now = getNowJST()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

/**
 * JSTの今日の終了時刻（23:59:59）を取得
 */
export function getTodayEndJST(): Date {
  const now = getNowJST()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
}

/**
 * 日付をJSTのYYYY-MM-DD形式でフォーマット
 */
export function formatDateJST(date: Date | string): string {
  const jstDate = toJST(date)
  const year = jstDate.getFullYear()
  const month = String(jstDate.getMonth() + 1).padStart(2, '0')
  const day = String(jstDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 日付をJSTの日時形式でフォーマット
 */
export function formatDateTimeJST(date: Date | string): string {
  const jstDate = toJST(date)
  const dateStr = formatDateJST(jstDate)
  const hours = String(jstDate.getHours()).padStart(2, '0')
  const minutes = String(jstDate.getMinutes()).padStart(2, '0')
  return `${dateStr} ${hours}:${minutes}`
}

/**
 * YYYY-MM-DD形式の文字列からJSTの日付範囲を取得（DBクエリ用）
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns { start: UTC開始時刻, end: UTC終了時刻 }
 */
export function getDateRangeForDB(dateStr: string): { start: Date, end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number)
  // JSTの00:00:00
  const startJST = new Date(year, month - 1, day, 0, 0, 0, 0)
  // JSTの23:59:59
  const endJST = new Date(year, month - 1, day, 23, 59, 59, 999)
  
  // UTCに変換してDBクエリで使用
  return {
    start: toUTC(startJST),
    end: toUTC(endJST)
  }
}

/**
 * 過去N日前のJST日付を取得
 */
export function getDaysAgoJST(days: number): Date {
  const now = getNowJST()
  now.setDate(now.getDate() - days)
  return now
}

/**
 * Kaito API用のsinceパラメータを生成（JST基準）
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns Kaito API用のsince文字列（UTC形式）
 */
export function getKaitoSinceParam(dateStr: string): string {
  const { start } = getDateRangeForDB(dateStr)
  const year = start.getUTCFullYear()
  const month = String(start.getUTCMonth() + 1).padStart(2, '0')
  const day = String(start.getUTCDate()).padStart(2, '0')
  const hours = String(start.getUTCHours()).padStart(2, '0')
  const minutes = String(start.getUTCMinutes()).padStart(2, '0')
  const seconds = String(start.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}_UTC`
}