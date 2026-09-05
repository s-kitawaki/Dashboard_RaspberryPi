export const JAPAN_ZONE = 'Asia/Tokyo'
export const weekdays = ['日', '月', '火', '水', '木', '金', '土']
const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: JAPAN_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

export function japanDate(now: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(now).map(p => [p.type, p.value]))
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  return { year, month, day, hour: parts.hour!, minute: parts.minute!, second: parts.second!, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}

export function calendarWeeks(year: number, month: number): (number | null)[][] {
  const start = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, i) => i >= start && i < start + count ? i - start + 1 : null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

export function timeLabel(value: number): string {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: JAPAN_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value)
}

export function asOfLabel(value: string | null): string {
  if (!value) return '提供元の時刻なし'
  // Do not guess a timezone for legacy, timezone-less provider timestamps.
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value))) return '提供元の時刻不明'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: JAPAN_ZONE, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) + ' JST'
}
