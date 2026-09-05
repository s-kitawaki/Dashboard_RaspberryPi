import type { Weather, Forecast, Rate, ResourceState } from '../lib/api'

export const fixtureNow = new Date('2026-09-05T01:24:36Z')
export const sunIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g stroke="#ebcc82" stroke-width="3" stroke-linecap="round"><path d="M50 10v7m0 66v7M10 50h7m66 0h7M22 22l5 5m46 46l5 5M22 78l5-5m46-46l5-5"/></g><circle cx="50" cy="50" r="24" fill="#edcc82"/></svg>')
export const cloudIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="65" cy="33" r="20" fill="#edcc82"/><path d="M24 76a16 16 0 0 1-1-32 23 23 0 0 1 44-5 19 19 0 1 1 8 37Z" fill="#cfdbd7"/><path d="M24 76h51" stroke="#afc1bf" stroke-width="3" stroke-linecap="round"/></svg>')
export const sampleWeather: Weather = { condition: '晴れ、ときどき曇り', temperature: 28, humidity: 64, icon: cloudIcon }
export const sampleForecast: Forecast[] = [
  { hour: '12:00', icon: sunIcon, temp: 30, humidity: 58, pop: 10 },
  { hour: '15:00', icon: cloudIcon, temp: 29, humidity: 62, pop: 20 },
  { hour: '18:00', icon: cloudIcon, temp: 26, humidity: 68, pop: 30 },
  { hour: '21:00', icon: cloudIcon, temp: 24, humidity: 72, pop: 20 },
]
export const sampleRate: Rate = { exchange_rate: 147.82, exchange_diff: 0.24, as_of: '2026-09-05T01:00:00Z' }
export function ready<T>(data: T): ResourceState<T> { return { data, loading: false, error: null, updatedAt: fixtureNow.getTime(), stale: false } }
export function loading<T>(): ResourceState<T> { return { data: null, loading: true, error: null, updatedAt: null, stale: false } }
export function failed<T>(): ResourceState<T> { return { data: null, loading: false, error: 'データを取得できませんでした', updatedAt: null, stale: false } }
export function stale<T>(data: T): ResourceState<T> { return { ...ready(data), stale: true, updatedAt: fixtureNow.getTime() - 7_200_000 } }
