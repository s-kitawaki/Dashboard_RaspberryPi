import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isOldProviderTime, REFRESH_MS, STALE_MS, TIMEOUT_MS, useResource } from './useResource'
import { parseWeather, parseRate } from '../lib/api'
import { sampleWeather, sampleRate, fixtureNow } from '../stories/fixtures'

const response = (data: unknown, extra = {}) => new Response(JSON.stringify({ status: 'success', data, timestamp: new Date().toISOString(), stale: false, ...extra }))
const wrappers: ReturnType<typeof mount>[] = []
function harness() {
  let resource!: ReturnType<typeof useResource<ReturnType<typeof parseWeather>>>
  const wrapper = mount(defineComponent({ setup() { resource = useResource('/api/weather', parseWeather); return () => null } }))
  wrappers.push(wrapper)
  return resource
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(fixtureNow) })
afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers.length = 0; vi.useRealTimers(); vi.unstubAllGlobals() })

describe('independent hourly resources', () => {
  it('allows the hourly cron boundary and becomes stale at 90 minutes', () => {
    expect(isOldProviderTime(new Date(Date.now() - REFRESH_MS).toISOString(), Date.now())).toBe(false)
    expect(isOldProviderTime(new Date(Date.now() - STALE_MS + 1).toISOString(), Date.now())).toBe(false)
    expect(isOldProviderTime(new Date(Date.now() - STALE_MS).toISOString(), Date.now())).toBe(true)
  })
  it('starts loading, fetches immediately, and refreshes once per hour', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response(sampleWeather)))
    vi.stubGlobal('fetch', fetcher)
    const resource = harness()
    expect(resource.state.value.loading).toBe(true)
    await flushPromises()
    expect(resource.state.value.data).toEqual(sampleWeather)
    await vi.advanceTimersByTimeAsync(REFRESH_MS - 1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('retains last good data after failure and clears error on retry', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(sampleWeather)).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ ...sampleWeather, temperature: 29 }))
    vi.stubGlobal('fetch', fetcher)
    const resource = harness()
    await flushPromises()
    await resource.refresh()
    expect(resource.state.value).toMatchObject({ data: sampleWeather, stale: true, loading: false })
    expect(resource.state.value.error).not.toBeNull()
    await resource.refresh()
    expect(resource.state.value).toMatchObject({ data: { temperature: 29 }, stale: false, error: null })
  })
  it('treats initial 503 as unavailable without inventing data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'データの準備中です' }), { status: 503 })))
    const resource = harness()
    await flushPromises()
    expect(resource.state.value).toMatchObject({ data: null, loading: false, stale: false })
    expect(resource.state.value.error).not.toBeNull()
  })
  it('preserves the initial scheduled update message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: '初回の定時更新を待っています' }), { status: 503 })))
    const resource = harness()
    await flushPromises()
    expect(resource.state.value.error).toBe('初回の定時更新を待っています')
  })
  it('honors backend stale flag and snapshot age', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(sampleWeather, { stale: true })).mockResolvedValueOnce(response(sampleWeather, { timestamp: '2026-09-04T00:00:00Z' })))
    const resource = harness()
    await flushPromises()
    expect(resource.state.value.stale).toBe(true)
    await resource.refresh()
    expect(resource.state.value.stale).toBe(true)
  })
  it('marks weekend quotes stale even when a snapshot has just refreshed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...sampleRate, as_of: '2026-09-04T20:59:00Z' })))
    let resource!: ReturnType<typeof useResource<ReturnType<typeof parseRate>>>
    wrappers.push(mount(defineComponent({ setup() { resource = useResource('/api/rate', parseRate, data => data.as_of); return () => null } })))
    await flushPromises()
    expect(resource.state.value.stale).toBe(true)
    expect(isOldProviderTime(null, Date.now())).toBe(true)
  })
  it('times out hung requests and prevents overlapping refreshes', async () => {
    const fetcher = vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
    vi.stubGlobal('fetch', fetcher)
    const resource = harness()
    await resource.refresh()
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(resource.state.value.loading).toBe(false)
    expect(resource.state.value.error).not.toBeNull()
  })
  it('aborts in-flight requests and clears timers on unmount', async () => {
    let signal: AbortSignal | undefined
    const fetcher = vi.fn((_url, options: RequestInit) => { signal = options.signal!; return new Promise(() => {}) })
    vi.stubGlobal('fetch', fetcher)
    harness()
    wrappers[0]!.unmount()
    expect(signal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(REFRESH_MS * 2)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
