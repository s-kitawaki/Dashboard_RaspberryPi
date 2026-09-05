import { describe, expect, it, vi } from 'vitest'
import { getData, parseForecast, parseRate, parseWeather } from './api'
import { sampleForecast, sampleRate, sampleWeather } from '../stories/fixtures'

describe('public API contract', () => {
  it('projects public fields only', () => {
    expect(parseRate({ ...sampleRate, entry_price: 123, private_position: 'secret' })).toEqual(sampleRate)
  })
  it('rejects placeholder, malformed and empty payloads', () => {
    expect(() => parseWeather({ ...sampleWeather, temperature: '--' })).toThrow()
    expect(() => parseWeather({ ...sampleWeather, humidity: 101 })).toThrow()
    expect(() => parseForecast([])).toThrow()
    expect(() => parseForecast([{ ...sampleForecast[0], hour: '25:00' }])).toThrow()
    expect(() => parseRate({ ...sampleRate, exchange_rate: NaN })).toThrow()
  })
  it('keeps up to four forecasts and permits partial responses', () => {
    expect(parseForecast([...sampleForecast, ...sampleForecast])).toHaveLength(4)
    expect(parseForecast(sampleForecast.slice(0, 1))).toHaveLength(1)
  })
  it('handles missing legacy rate fields without fabricated values', () => {
    expect(parseRate({ exchange_rate: 150 })).toEqual({ exchange_rate: 150, exchange_diff: null, as_of: null })
  })
  it('preserves snapshot metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: sampleRate, stale: true, timestamp: '2026-09-04T00:00:00Z' }))))
    expect(await getData('/api/rate', parseRate, new AbortController().signal)).toEqual({ data: sampleRate, stale: true, timestamp: Date.parse('2026-09-04T00:00:00Z') })
    vi.unstubAllGlobals()
  })
})
