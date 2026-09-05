import { vi } from 'vitest';
import type { Env, Position, Quote } from '../src/types';

export const NOW = Date.parse('2026-09-05T03:00:00.000Z');
export function setup() {
  const values = new Map<string, string>();
  const kv = {
    get: vi.fn(async (key: string, format?: string) => {
      const value = values.get(key) ?? null;
      return value !== null && format === 'json' ? JSON.parse(value) : value;
    }),
    put: vi.fn(async (key: string, value: string, _options?: unknown) => { values.set(key, value); }),
    delete: vi.fn(async (key: string) => { values.delete(key); }),
  };
  const env = {
    DASHBOARD_KV: kv as unknown as Env['DASHBOARD_KV'],
    OPENWEATHER_API_KEY: 'private-weather-key', TWELVE_DATA_API_KEY: 'private-rate-key',
    DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/private-webhook-token',
    DISCORD_PUBLIC_KEY: '', DISCORD_GUILD_ID: 'guild-1', DISCORD_CHANNEL_ID: 'channel-1',
    DISCORD_ALLOWED_USER_IDS: ' user-1, user-2, ', LATITUDE: '35.68', LONGITUDE: '139.76',
  } satisfies Env;
  const jobs: Promise<unknown>[] = [];
  const ctx = { waitUntil: vi.fn((job: Promise<unknown>) => { jobs.push(job); }) };
  const seed = (key: string, value: unknown) => values.set(key, JSON.stringify(value));
  return { env, kv, values, seed, jobs, ctx: ctx as unknown as ExecutionContext, drain: () => Promise.all(jobs) };
}
export function position(overrides: Partial<Position> = {}): Position {
  return { price: 150, side: 'long', quantity: 1000, updatedAt: new Date(NOW).toISOString(), updatedBy: 'user-1', ...overrides };
}
export function rate(overrides: Partial<Quote> = {}): Quote {
  return { exchange_rate: 152, exchange_diff: null, as_of: new Date(NOW).toISOString(), open: 151, high: 153, low: 149, ...overrides };
}
export function weatherItem(overrides: Record<string, unknown> = {}) {
  return { dt: NOW / 1000, main: { temp: 26.6, humidity: 65 }, weather: [{ description: '晴れ', icon: '01d' }], pop: 0.25, ...overrides };
}
export function mockUpstreams(webhookStatus = 204) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === 'api.openweathermap.org' && url.pathname.endsWith('/weather')) return Response.json(weatherItem());
    if (url.hostname === 'api.openweathermap.org' && url.pathname.endsWith('/forecast')) return Response.json({ list: Array.from({ length: 5 }, (_, i) => weatherItem({ dt: NOW / 1000 + i * 10800 })) });
    if (url.hostname === 'api.twelvedata.com') return Response.json({ symbol: 'USD/JPY', close: '152', timestamp: NOW / 1000, open: '151', high: '153', low: '149' });
    if (url.hostname === 'discord.com') return new Response(null, { status: webhookStatus });
    throw new Error(`Unexpected test URL: ${url.origin}${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
