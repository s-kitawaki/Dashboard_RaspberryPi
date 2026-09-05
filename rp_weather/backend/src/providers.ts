import type { Env, Quote } from './types';

export async function requestJson<T>(url: string | URL): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  // Never propagate upstream URLs (they contain credentials) or response bodies.
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  return response.json<T>();
}
function number(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) throw new Error('Missing numeric data');
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Invalid numeric data');
  return n;
}
function icon(value: string): string {
  if (!/^\d{2}[dn]$/.test(value)) throw new Error('Invalid weather icon');
  return `https://openweathermap.org/img/wn/${value}@2x.png`;
}
function bounded(value: unknown, min: number, max: number): number {
  const n = number(value);
  if (n < min || n > max) throw new Error('Data outside valid range');
  return n;
}
function description(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing condition');
  return value;
}
function date(value: unknown): Date {
  const parsed = new Date(number(value) * 1000);
  if (!Number.isFinite(parsed.getTime())) throw new Error('Invalid timestamp');
  return parsed;
}
interface WeatherItem {
  dt: number; main: { temp: number; humidity: number };
  weather: { description: string; icon: string }[]; pop?: number;
}
function weatherUrl(env: Env, path: string): URL {
  if (!env.OPENWEATHER_API_KEY) throw new Error('Weather credentials missing');
  const url = new URL(`https://api.openweathermap.org/data/2.5/${path}`);
  url.search = new URLSearchParams({ lat: env.LATITUDE, lon: env.LONGITUDE, appid: env.OPENWEATHER_API_KEY, units: 'metric', lang: 'ja' }).toString();
  return url;
}
export async function weather(env: Env) {
  const value = await requestJson<WeatherItem>(weatherUrl(env, 'weather'));
  return { condition: description(value.weather[0].description), temperature: Math.round(number(value.main.temp)), humidity: bounded(value.main.humidity, 0, 100), icon: icon(value.weather[0].icon) };
}
export async function forecast(env: Env) {
  const value = await requestJson<{ list: WeatherItem[] }>(weatherUrl(env, 'forecast'));
  if (!Array.isArray(value.list) || value.list.length < 4) throw new Error('Incomplete forecast');
  return value.list.slice(0, 4).map(item => ({
    hour: date(item.dt).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }),
    icon: icon(item.weather[0].icon), temp: Math.round(number(item.main.temp)),
    humidity: bounded(item.main.humidity, 0, 100), pop: Math.round(bounded(item.pop ?? 0, 0, 1) * 100),
  }));
}
export async function quote(env: Env): Promise<Quote> {
  if (!env.TWELVE_DATA_API_KEY) throw new Error('Rate credentials missing');
  const url = new URL('https://api.twelvedata.com/quote');
  url.search = new URLSearchParams({ symbol: 'USD/JPY', apikey: env.TWELVE_DATA_API_KEY }).toString();
  const value = await requestJson<Record<string, unknown>>(url);
  if (value.status === 'error' || value.symbol !== 'USD/JPY') throw new Error('Invalid quote');
  const price = number(value.close);
  const timestamp = number(value.timestamp) * 1000;
  if (price <= 0 || timestamp <= 0 || timestamp > Date.now() + 300_000) throw new Error('Invalid quote');
  return { exchange_rate: price, exchange_diff: null, as_of: new Date(timestamp).toISOString(), open: number(value.open), high: number(value.high), low: number(value.low) };
}
