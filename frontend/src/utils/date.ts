/**
 * 日付ユーティリティ関数
 */

/**
 * 日付を指定されたフォーマットで文字列に変換
 * @param date - 変換する日付
 * @param format - フォーマット文字列 (デフォルト: 'YYYY-MM-DD HH:mm:ss')
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: string | Date | null | undefined, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!date) return '-'

  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    case 'MM/DD':
      return `${month}/${day}`
    case 'MM/DD HH:mm':
      return `${month}/${day} ${hours}:${minutes}`
    case 'relative':
      return getRelativeTime(d)
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}

/**
 * 相対時間を取得（○分前、○時間前など）
 * @param date - 対象の日付
 * @returns 相対時間文字列
 */
export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}日前`
  if (hours > 0) return `${hours}時間前`
  if (minutes > 0) return `${minutes}分前`
  return '今'
}

/**
 * 日付範囲をフォーマット
 * @param startDate - 開始日
 * @param endDate - 終了日
 * @returns フォーマットされた日付範囲文字列
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = formatDate(startDate, 'YYYY-MM-DD')
  const end = formatDate(endDate, 'YYYY-MM-DD')
  return `${start} 〜 ${end}`
}

/**
 * 今日の日付を取得
 * @param format - フォーマット
 * @returns 今日の日付文字列
 */
export function getToday(format: string = 'YYYY-MM-DD'): string {
  return formatDate(new Date(), format)
}

/**
 * 指定した日数前の日付を取得
 * @param days - 日数
 * @param format - フォーマット
 * @returns 指定日数前の日付文字列
 */
export function getDaysAgo(days: number, format: string = 'YYYY-MM-DD'): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return formatDate(date, format)
}

/**
 * 日付が有効かチェック
 * @param date - チェックする日付
 * @returns 有効な日付かどうか
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * 日時を 'YYYY-MM-DD HH:mm:ss' フォーマットで変換
 * @param date - 変換する日付
 * @returns フォーマットされた日時文字列
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss')
}