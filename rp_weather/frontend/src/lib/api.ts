export interface Weather { condition: string; temperature: number; humidity: number; icon: string }
export interface Forecast { hour: string; icon: string; temp: number; humidity: number; pop: number }
export interface Rate { exchange_rate: number; exchange_diff: number | null; as_of: string | null }
export interface ResourceState<T> { data: T | null; loading: boolean; error: string | null; updatedAt: number | null; stale: boolean }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object')
  return value as Record<string, unknown>
}
function numeric(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid number')
  return value
}
function percent(value: unknown): number {
  const number = numeric(value)
  if (number < 0 || number > 100) throw new Error('Invalid percent')
  return number
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid string')
  return value
}
export function parseWeather(value: unknown): Weather {
  const data = record(value)
  const condition = string(data.condition)
  if (!condition.trim()) throw new Error('Empty condition')
  return { condition, temperature: numeric(data.temperature), humidity: percent(data.humidity), icon: string(data.icon) }
}
export function parseForecast(value: unknown): Forecast[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Empty forecast')
  return value.slice(0, 4).map(item => {
    const data = record(item)
    const hour = string(data.hour)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) throw new Error('Invalid hour')
    return { hour, icon: string(data.icon), temp: numeric(data.temp), humidity: percent(data.humidity), pop: percent(data.pop) }
  })
}
export function parseRate(value: unknown): Rate {
  const data = record(value)
  const rate = numeric(data.exchange_rate)
  if (rate <= 0) throw new Error('Invalid rate')
  // Copy only public fields; never retain entry prices or other account data.
  return { exchange_rate: rate, exchange_diff: data.exchange_diff == null ? null : numeric(data.exchange_diff), as_of: data.as_of == null ? null : string(data.as_of) }
}
export interface Snapshot<T> { data: T; stale: boolean; timestamp: number | null }
export class PublicApiError extends Error {}
export async function getData<T>(url: string, parse: (value: unknown) => T, signal: AbortSignal): Promise<Snapshot<T>> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (response.status === 503) {
    const body: unknown = await response.json().catch(() => null)
    if (body && typeof body === 'object' && 'message' in body && body.message === '初回の定時更新を待っています') {
      throw new PublicApiError(body.message)
    }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const envelope = record(await response.json())
  if (envelope.status === 'error') throw new Error('API error')
  const timestamp = typeof envelope.timestamp === 'string' ? Date.parse(envelope.timestamp) : NaN
  return { data: parse(envelope.data), stale: envelope.stale === true, timestamp: Number.isFinite(timestamp) ? timestamp : null }
}
