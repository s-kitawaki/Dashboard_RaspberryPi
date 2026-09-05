import { describe, expect, it } from 'vitest'
import { asOfLabel, calendarWeeks, japanDate } from './time'

describe('Japan time and calendar', () => {
  it('rolls to the next year at midnight JST regardless of machine timezone', () => {
    expect(japanDate(new Date('2026-12-31T15:00:00Z'))).toMatchObject({ year: 2027, month: 1, day: 1, hour: '00', weekday: 5 })
  })
  it('includes February 29 in leap years and renders six-week months', () => {
    expect(calendarWeeks(2028, 2).flat().filter(Boolean)).toHaveLength(29)
    expect(calendarWeeks(2026, 8)).toHaveLength(6)
  })
  it('formats provider timestamps in JST without guessing missing zones', () => {
    expect(asOfLabel('2026-09-04T20:59:00Z')).toBe('9/5 05:59 JST')
    expect(asOfLabel('2026-09-04T20:59:00')).toBe('提供元の時刻不明')
    expect(asOfLabel(null)).toBe('提供元の時刻なし')
  })
})
