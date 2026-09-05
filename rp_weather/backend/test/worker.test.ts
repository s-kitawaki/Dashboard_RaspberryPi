import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { notify, refresh } from '../src/index';
import { POSITION_KEY } from '../src/types';
import { NOW, mockUpstreams, position, rate, setup } from './helpers';

beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(NOW); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const hourKey = (time = NOW) => `notified:${Math.floor(time / 3_600_000)}`;
const webhookCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith('https://discord.com/'));

describe('scheduled refresh and notification state', () => {
  it('fetches all providers, saves public snapshots, and posts one notification with position PnL', async () => {
    mockUpstreams(); const fixture = setup();
    fixture.seed(POSITION_KEY, position({ side: 'short' }));
    fixture.seed('snapshot:rate', { data: rate({ exchange_rate: 150 }), timestamp: new Date(NOW - 3600000).toISOString() });
    fixture.seed('notification:last', { price: 149 });
    await worker.scheduled({ scheduledTime: NOW } as ScheduledController, fixture.env);
    expect(JSON.parse(fixture.values.get('snapshot:weather')!).data.temperature).toBe(27);
    expect(JSON.parse(fixture.values.get('snapshot:forecast')!).data).toHaveLength(4);
    expect(JSON.parse(fixture.values.get('snapshot:rate')!).data).toMatchObject({ exchange_rate: 152, exchange_diff: 2 });
    expect(webhookCalls()).toHaveLength(1);
    const request = webhookCalls()[0][1]!;
    expect(request.method).toBe('POST');
    const payload = JSON.parse(request.body as string);
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.content).toContain('💰 **ポジション損益状況**');
    expect(payload.content).toContain('保有単価： 150.000 円（売り）');
    expect(payload.content).toContain('損益幅　： 📉 -2.000 円/USD');
    expect(payload.content).not.toContain('保有数量');
    expect(payload.content).not.toContain('評価損益');
    expect(payload.content).toContain('🔄 前回比（前回通知時）： +3.000 円');
    expect(fixture.values.get(hourKey())).toBe('sent');
    expect(fixture.kv.put).toHaveBeenCalledWith(hourKey(), 'sent', { expirationTtl: 172800 });
    expect(JSON.parse(fixture.values.get('notification:last')!)).toEqual({ price: 152 });
  });
  it('does not advance notification state before webhook acceptance', async () => {
    const fixture = setup(); fixture.seed('notification:last', { price: 149 });
    let accept!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(resolve => { accept = resolve; })));
    const pending = notify(fixture.env, rate(), NOW);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fixture.kv.put).not.toHaveBeenCalled();
    expect(fixture.values.has(hourKey())).toBe(false);
    expect(JSON.parse(fixture.values.get('notification:last')!)).toEqual({ price: 149 });
    accept(new Response(null, { status: 204 })); await pending;
    expect(fixture.values.get(hourKey())).toBe('sent');
  });
  it.each([429, 500])('retains comparison state on webhook HTTP %s and allows a same-hour retry', async status => {
    mockUpstreams(status); const fixture = setup(); fixture.seed('notification:last', { price: 149 });
    await expect(refresh(fixture.env, NOW)).rejects.toThrow('rate/notification');
    expect(fixture.values.has(hourKey())).toBe(false);
    expect(JSON.parse(fixture.values.get('notification:last')!)).toEqual({ price: 149 });
    expect(fixture.values.has('snapshot:rate')).toBe(true);
    expect(fixture.values.has('snapshot:weather')).toBe(true);
    mockUpstreams(); await refresh(fixture.env, NOW);
    expect(webhookCalls()).toHaveLength(1);
    expect(JSON.parse(webhookCalls()[0][1]!.body as string).content).toContain('前回比（前回通知時）： +3.000 円');
    expect(fixture.values.get(hourKey())).toBe('sent');
  });
  it('preserves state on a network rejection', async () => {
    const fixture = setup(); fixture.seed('notification:last', { price: 149 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    await expect(notify(fixture.env, rate(), NOW)).rejects.toThrow('network failed');
    expect(fixture.kv.put).not.toHaveBeenCalled();
    expect(fixture.values.has(hourKey())).toBe(false);
  });
  it('deduplicates sequential invocations in the same hour and notifies in the next hour', async () => {
    mockUpstreams(); const fixture = setup();
    await notify(fixture.env, rate(), NOW);
    await notify(fixture.env, rate({ exchange_rate: 153 }), NOW + 1);
    expect(webhookCalls()).toHaveLength(1);
    expect(JSON.parse(fixture.values.get('notification:last')!)).toEqual({ price: 152 });
    await notify(fixture.env, rate({ exchange_rate: 154 }), NOW + 3600000);
    expect(webhookCalls()).toHaveLength(2);
    expect(JSON.parse(webhookCalls()[1][1]!.body as string).content).toContain('前回比（前回通知時）： +2.000 円');
    expect(fixture.values.get(hourKey(NOW + 3600000))).toBe('sent');
  });
  it('uses the compact market layout without a position section', async () => {
    mockUpstreams(); const fixture = setup();
    await notify(fixture.env, rate({ as_of: new Date(NOW - 91 * 60000).toISOString() }), NOW);
    const content = JSON.parse(webhookCalls()[0][1]!.body as string).content;
    expect(content).toBe([
      '📈 現在価格（参考値）： 152.000 円',
      '🔄 前回比（前回通知時）： 初回通知',
      '',
      '💱 **USD/JPY 為替通知**',
      '📅 取得日時： 2026/09/05 12:00:00',
      '------------------------------',
      '始値： 151.000',
      '高値： 153.000',
      '安値： 149.000',
      '------------------------------',
    ].join('\n'));
    expect(content).not.toContain('ポジション');
  });
  it('rejects a webhook URL on another host without sending or committing', async () => {
    const fixture = setup(); fixture.env.DISCORD_WEBHOOK_URL = 'https://discord.com.evil.test/api/webhooks/123/token';
    mockUpstreams();
    await expect(notify(fixture.env, rate(), NOW)).rejects.toThrow('Webhook configuration invalid');
    expect(fetch).not.toHaveBeenCalled(); expect(fixture.kv.put).not.toHaveBeenCalled();
  });
  it('keeps the last good rate and avoids a webhook when quote fetch fails, while updating weather', async () => {
    const fixture = setup(); const oldSnapshot = { data: rate({ exchange_rate: 149 }), timestamp: new Date(NOW - 3600000).toISOString() };
    fixture.seed('snapshot:rate', oldSnapshot);
    const fetchMock = mockUpstreams(); const upstream = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async input => String(input).includes('twelvedata.com') ? new Response('secret provider body', { status: 503 }) : upstream(input));
    await expect(refresh(fixture.env, NOW)).rejects.toThrow(/^Scheduled refresh failed: rate\/notification: Upstream HTTP 503$/);
    expect(JSON.parse(fixture.values.get('snapshot:rate')!)).toEqual(oldSnapshot);
    expect(fixture.values.has('snapshot:weather')).toBe(true);
    expect(fixture.values.has('snapshot:forecast')).toBe(true);
    expect(webhookCalls()).toHaveLength(0);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });
  it('updates rate and notifies even when the weather provider fails', async () => {
    const fixture = setup(); fixture.seed('snapshot:weather', { data: { temperature: 19 }, timestamp: 'old' });
    const fetchMock = mockUpstreams(); const upstream = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async input => new URL(String(input)).pathname.endsWith('/weather') ? new Response(null, { status: 500 }) : upstream(input));
    await expect(refresh(fixture.env, NOW)).rejects.toThrow(/^Scheduled refresh failed: weather: Upstream HTTP 500$/);
    expect(JSON.parse(fixture.values.get('snapshot:weather')!).data.temperature).toBe(19);
    expect(fixture.values.has('snapshot:rate')).toBe(true);
    expect(webhookCalls()).toHaveLength(1);
  });
});

describe('public read API', () => {
  it.each(['weather', 'forecast', 'rate'])('reads only the %s snapshot and never calls providers or Discord', async name => {
    const fixture = setup(); mockUpstreams();
    const data = name === 'rate' ? rate() : name === 'forecast' ? [{ hour: '12:00', temp: 27 }] : { temperature: 27 };
    fixture.seed(`snapshot:${name}`, { data, timestamp: new Date(NOW).toISOString() });
    fixture.seed(POSITION_KEY, position()); fixture.seed('notification:last', { price: 100 });
    for (let i = 0; i < 2; i++) {
      const response = await worker.fetch(new Request(`https://dashboard.test/api/${name}`), fixture.env, fixture.ctx);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      const body = await response.json();
      expect(body).toEqual({ status: 'success', data, timestamp: new Date(NOW).toISOString(), stale: false });
      expect(JSON.stringify(body)).not.toMatch(/private|updatedBy|quantity|user-1/);
    }
    expect(fixture.kv.get.mock.calls).toEqual([[`snapshot:${name}`, 'json'], [`snapshot:${name}`, 'json']]);
    expect(fetch).not.toHaveBeenCalled(); expect(fixture.kv.put).not.toHaveBeenCalled();
  });
  it.each([90 * 60000, 90 * 60000 + 1])('marks cached data stale only after 90 minutes (age %s)', async age => {
    const fixture = setup(); fixture.seed('snapshot:rate', { data: rate(), timestamp: new Date(NOW - age).toISOString() });
    const response = await worker.fetch(new Request('https://dashboard.test/api/rate'), fixture.env, fixture.ctx);
    expect((await response.json() as { stale: boolean }).stale).toBe(age > 90 * 60000);
  });
  it.each([false, true])('returns a sanitized uncacheable 503 for missing/storage-failed snapshot (failure=%s)', async failure => {
    const fixture = setup(); mockUpstreams();
    if (failure) fixture.kv.get.mockRejectedValueOnce(new Error(fixture.env.DISCORD_WEBHOOK_URL));
    const response = await worker.fetch(new Request('https://dashboard.test/api/rate'), fixture.env, fixture.ctx);
    expect(response.status).toBe(503); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).not.toContain('private'); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['/api/position', '/api/notification:last', '/api/notified:123', '/api/secrets', '/unknown'])('does not expose private route %s', async path => {
    const fixture = setup(); mockUpstreams();
    expect((await worker.fetch(new Request(`https://dashboard.test${path}`), fixture.env, fixture.ctx)).status).toBe(404);
    expect(fixture.kv.get).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('rejects %s to a read endpoint', async method => {
    const fixture = setup(); mockUpstreams();
    const response = await worker.fetch(new Request('https://dashboard.test/api/rate', { method }), fixture.env, fixture.ctx);
    expect(response.status).toBe(405); expect(response.headers.get('Allow')).toBe('GET');
    expect(fixture.kv.get).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
});
