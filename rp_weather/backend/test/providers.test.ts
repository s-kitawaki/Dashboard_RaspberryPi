import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forecast, quote, requestJson, weather } from '../src/providers';
import { NOW, mockUpstreams, setup, weatherItem } from './helpers';

beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const returns = (value: unknown) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(value)));

describe('weather and forecast providers', () => {
  it('requests metric Japanese weather at the configured coordinates and normalizes it', async () => {
    const fetchMock = mockUpstreams(); const { env } = setup();
    expect(await weather(env)).toEqual({ condition: '晴れ', temperature: 27, humidity: 65, icon: 'https://openweathermap.org/img/wn/01d@2x.png' });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/data/2.5/weather');
    expect(Object.fromEntries(url.searchParams)).toEqual({ lat: env.LATITUDE, lon: env.LONGITUDE, appid: env.OPENWEATHER_API_KEY, units: 'metric', lang: 'ja' });
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it('returns only four forecast slots with JST times and precipitation percentages', async () => {
    mockUpstreams();
    const result = await forecast(setup().env);
    expect(result).toHaveLength(4);
    expect(result.map(item => item.hour)).toEqual(['12:00', '15:00', '18:00', '21:00']);
    expect(result[0]).toEqual({ hour: '12:00', icon: 'https://openweathermap.org/img/wn/01d@2x.png', temp: 27, humidity: 65, pop: 25 });
  });
  it('accepts numeric strings and defaults missing precipitation to zero', async () => {
    returns({ list: Array(4).fill(weatherItem({ main: { temp: '21.2', humidity: '50' }, pop: undefined })) });
    expect((await forecast(setup().env))[0]).toMatchObject({ temp: 21, humidity: 50, pop: 0 });
  });
  it.each([undefined, null, {}, [], [weatherItem()]])('rejects incomplete forecast list %j', async list => {
    returns({ list });
    await expect(forecast(setup().env)).rejects.toThrow('Incomplete forecast');
  });
  it.each([null, '', ' ', true, 'NaN', 'Infinity'])('rejects invalid weather numeric data %j', async temp => {
    returns(weatherItem({ main: { temp, humidity: 50 } }));
    await expect(weather(setup().env)).rejects.toThrow();
  });
  it.each(['../secret', 'https://evil.test/a', '1d', '01x'])('rejects unsafe weather icon %s', async icon => {
    returns(weatherItem({ weather: [{ description: '晴れ', icon }] }));
    await expect(weather(setup().env)).rejects.toThrow('Invalid weather icon');
  });
  it('validates all four returned forecast slots', async () => {
    returns({ list: [weatherItem(), weatherItem(), weatherItem(), weatherItem({ pop: 'bad' })] });
    await expect(forecast(setup().env)).rejects.toThrow('Invalid numeric data');
  });
  it.each([weather, forecast])('rejects missing weather credentials before requesting upstream', async provider => {
    const fetchMock = mockUpstreams(); const { env } = setup(); env.OPENWEATHER_API_KEY = '';
    await expect(provider(env)).rejects.toThrow('Weather credentials missing');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects humidity outside the physical range', async () => {
    returns(weatherItem({ main: { temp: 20, humidity: 150 } }));
    await expect(weather(setup().env)).rejects.toThrow();
  });
  it('rejects precipitation probability above one', async () => {
    returns({ list: Array(4).fill(weatherItem({ pop: 1.5 })) });
    await expect(forecast(setup().env)).rejects.toThrow();
  });
  it('rejects an unrepresentable forecast timestamp', async () => {
    returns({ list: Array(4).fill(weatherItem({ dt: 1e20 })) });
    await expect(forecast(setup().env)).rejects.toThrow();
  });
  it('rejects a missing weather description', async () => {
    returns(weatherItem({ weather: [{ icon: '01d' }] }));
    await expect(weather(setup().env)).rejects.toThrow();
  });
});

describe('quote and upstream errors', () => {
  it('normalizes the USD/JPY quote including provider timestamp', async () => {
    mockUpstreams();
    expect(await quote(setup().env)).toEqual({ exchange_rate: 152, exchange_diff: null, as_of: new Date(NOW).toISOString(), open: 151, high: 153, low: 149 });
  });
  it.each([{ status: 'error' }, { symbol: 'EUR/USD' }, { close: 0 }, { close: -1 }, { close: '' }, { timestamp: 0 }, { timestamp: NOW / 1000 + 301 }, { high: null }])('rejects invalid quote %j', async override => {
    returns({ symbol: 'USD/JPY', close: '152', timestamp: NOW / 1000, open: 151, high: 153, low: 149, ...override });
    await expect(quote(setup().env)).rejects.toThrow();
  });
  it('does not expose upstream credentials or response bodies in HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private upstream details', { status: 403 })));
    await expect(requestJson('https://provider.test/?apikey=private-secret')).rejects.toThrow(/^Upstream HTTP 403$/);
  });
});
