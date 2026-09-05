import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { command, ENTRY_USAGE, interactions, parseOrder, verify } from '../src/discord';
import { POSITION_KEY } from '../src/types';
import { NOW, position, rate, setup } from './helpers';

let keys: CryptoKeyPair;
let publicKey: string;
let nextId = 1000;
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
beforeAll(async () => {
  keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair;
  publicKey = hex(await crypto.subtle.exportKey('raw', keys.publicKey));
});
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function interaction(overrides: Record<string, unknown> = {}) {
  return { id: String(nextId++), application_id: '123', token: 'signed-token', type: 2,
    guild_id: 'guild-1', channel_id: 'channel-1', member: { user: { id: 'user-1' } },
    data: { name: 'entry', options: [{ name: 'order', value: '150' }] }, ...overrides };
}
async function signedRequest(value: unknown, timestamp = String(NOW / 1000), sentBody?: string) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const signature = hex(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(timestamp + body)));
  return new Request('https://dashboard.test/discord/interactions', { method: 'POST', body: sentBody ?? body,
    headers: { 'X-Signature-Ed25519': signature, 'X-Signature-Timestamp': timestamp } });
}
async function dispatch(value: unknown, fixture = setup(), timestamp?: string) {
  fixture.env.DISCORD_PUBLIC_KEY = publicKey;
  const response = await interactions(await signedRequest(value, timestamp), fixture.env, fixture.ctx);
  return { ...fixture, response, body: await response.json() };
}

describe('signed Discord verification and authorization', () => {
  it('accepts a genuinely signed PING before guild authorization without side effects', async () => {
    const result = await dispatch({ type: 1 });
    expect(result.response.status).toBe(200);
    expect(result.body).toEqual({ type: 1 });
    expect(result.ctx.waitUntil).not.toHaveBeenCalled();
    expect(result.kv.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects a tampered signed body', async () => {
    const fixture = setup(); fixture.env.DISCORD_PUBLIC_KEY = publicKey;
    const response = await interactions(await signedRequest({ type: 1 }, undefined, '{"type":2}'), fixture.env, fixture.ctx);
    expect(response.status).toBe(401);
    expect(fixture.ctx.waitUntil).not.toHaveBeenCalled();
  });
  it.each([-301, 301])('rejects a cryptographically valid timestamp offset by %s seconds', async offset => {
    const fixture = setup(); fixture.env.DISCORD_PUBLIC_KEY = publicKey;
    const response = await interactions(await signedRequest({ type: 1 }, String(NOW / 1000 + offset)), fixture.env, fixture.ctx);
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([-300, 300])('accepts the freshness boundary at %s seconds', async offset => {
    expect((await dispatch({ type: 1 }, setup(), String(NOW / 1000 + offset))).body).toEqual({ type: 1 });
  });
  it('rejects missing/malformed signature headers and an unrelated public key', async () => {
    expect(await verify(new Request('https://dashboard.test'), '{}', publicKey)).toBe(false);
    const request = await signedRequest({ type: 1 });
    expect(await verify(request.clone(), '{"type":1}', 'zz'.repeat(32))).toBe(false);
    expect(await verify(request.clone(), '{"type":1}', '00'.repeat(32))).toBe(false);
    request.headers.set('X-Signature-Timestamp', 'NaN');
    expect(await verify(request, '{"type":1}', publicKey)).toBe(false);
  });
  it('returns 400 for signed malformed JSON', async () => {
    const fixture = setup(); fixture.env.DISCORD_PUBLIC_KEY = publicKey;
    expect((await interactions(await signedRequest('{'), fixture.env, fixture.ctx)).status).toBe(400);
  });
  it.each([
    { guild_id: 'other-guild' }, { channel_id: 'other-channel' }, { member: { user: { id: 'intruder' } } },
    { guild_id: undefined }, { member: undefined },
  ])('denies unauthorized context %j without storage or network effects', async override => {
    const result = await dispatch(interaction(override));
    expect(result.body).toMatchObject({ type: 4, data: { flags: 64, allowed_mentions: { parse: [] } } });
    expect(result.body.data.content).toContain('操作権限がありません');
    expect(result.ctx.waitUntil).not.toHaveBeenCalled();
    expect(result.kv.put).not.toHaveBeenCalled();
    expect(result.kv.delete).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['DISCORD_GUILD_ID', 'DISCORD_CHANNEL_ID', 'DISCORD_ALLOWED_USER_IDS'] as const)('fails closed when %s is empty', async key => {
    const fixture = setup(); fixture.env[key] = '';
    expect((await dispatch(interaction(), fixture)).body.type).toBe(4);
    expect(fixture.ctx.waitUntil).not.toHaveBeenCalled();
  });
  it.each([{ id: '../123' }, { id: '' }, { application_id: '../123' }, { token: '../evil?x=1' }])('rejects unsafe callback coordinates %j', async override => {
    const fixture = setup(); fixture.env.DISCORD_PUBLIC_KEY = publicKey;
    expect((await interactions(await signedRequest(interaction(override)), fixture.env, fixture.ctx)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('deferred position commands', () => {
  it('replaying a signed exit does not delete a position created after the original exit', async () => {
    const fixture = setup(); fixture.env.DISCORD_PUBLIC_KEY = publicKey;
    fixture.seed(POSITION_KEY, position());
    const original = await signedRequest(interaction({ id: '501', data: { name: 'exit' } }));
    await interactions(original.clone(), fixture.env, fixture.ctx); await fixture.drain();
    expect(fixture.values.has(POSITION_KEY)).toBe(false);
    await dispatch(interaction({ id: '502' }), fixture); await fixture.drain();
    expect(fixture.values.has(POSITION_KEY)).toBe(true);
    await interactions(original.clone(), fixture.env, fixture.ctx); await fixture.drain();
    expect(fixture.values.has(POSITION_KEY)).toBe(true);
    expect(fixture.kv.delete).toHaveBeenCalledTimes(1);
  });
  it('replaying the same signed entry after exit does not resurrect the position and reuses the cached response', async () => {
    const fixture = setup(); fixture.env.DISCORD_PUBLIC_KEY = publicKey;
    const original = await signedRequest(interaction({ id: '601' }));
    await interactions(original.clone(), fixture.env, fixture.ctx); await fixture.drain();
    expect(fixture.values.has(POSITION_KEY)).toBe(true);
    const firstReply = vi.mocked(fetch).mock.calls[0][1]!.body;
    expect(fixture.kv.put).toHaveBeenCalledWith('interaction:601', expect.stringContaining('登録しました'), { expirationTtl: 900 });
    await dispatch(interaction({ id: '602', data: { name: 'exit' } }), fixture); await fixture.drain();
    expect(fixture.values.has(POSITION_KEY)).toBe(false);
    const response = await interactions(original.clone(), fixture.env, fixture.ctx); await fixture.drain();
    expect(await response.json()).toEqual({ type: 5, data: { flags: 64 } });
    expect(fixture.values.has(POSITION_KEY)).toBe(false);
    expect(fixture.kv.put.mock.calls.filter(([key]) => key === POSITION_KEY)).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls.at(-1)![1]!.body).toBe(firstReply);
  });
  it('acknowledges while storage is blocked, then saves a replacement and edits the private response', async () => {
    const fixture = setup(); fixture.seed(POSITION_KEY, position({ price: 100 }));
    let release!: () => void;
    fixture.kv.put.mockImplementationOnce(async (key, value) => {
      await new Promise<void>(resolve => { release = resolve; });
      fixture.values.set(key, value);
    });
    const result = await dispatch(interaction(), fixture);
    expect(result.body).toEqual({ type: 5, data: { flags: 64 } });
    expect(result.ctx.waitUntil).toHaveBeenCalledOnce();
    expect(JSON.parse(fixture.values.get(POSITION_KEY)!).price).toBe(100);
    expect(fetch).not.toHaveBeenCalled();
    release(); await fixture.drain();
    expect(JSON.parse(fixture.values.get(POSITION_KEY)!)).toMatchObject({ price: 150, quantity: null, side: 'long', updatedBy: 'user-1' });
    expect(fetch).toHaveBeenCalledWith('https://discord.com/api/v10/webhooks/123/signed-token/messages/@original', expect.objectContaining({ method: 'PATCH' }));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.content).toContain('登録しました');
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });
  it('accepts a trimmed allowlist user and an explicit short order without quantity', async () => {
    const fixture = setup();
    await dispatch(interaction({ member: { user: { id: 'user-2' } }, data: { name: 'entry', options: [{ name: 'order', value: '149.5 short' }] } }), fixture);
    await fixture.drain();
    expect(JSON.parse(fixture.values.get(POSITION_KEY)!)).toEqual({ price: 149.5, quantity: null, side: 'short', updatedBy: 'user-2', updatedAt: expect.any(String) });
    const content = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).content;
    expect(content).toContain('149.500 円 / 売り');
    expect(content).toContain('1 USDあたり');
  });
  it.each([
    ['156.2111 long', 156.2111, 'long'], ['156.2111 short', 156.2111, 'short'], ['156.2111', 156.2111, 'long'],
    ['  150  SHORT  ', 150, 'short'], ['150 l', 150, 'long'], ['150 s', 150, 'short'],
    ['150 買い', 150, 'long'], ['150 売り', 150, 'short'], ['0.5 long', 0.5, 'long'], ['1000000', 1_000_000, 'long'],
  ])('parses the free-text order %j', (input, price, side) => {
    expect(parseOrder(input)).toEqual({ price, side });
  });
  it.each([
    '', '   ', 'abc', '150 buy', '150 long extra', '-1', '0', '1000000.01', '150,5', '150.', '.5', '1e3', 'Infinity', 'NaN long',
    '150long', 'long 150',
  ])('rejects the malformed order %j', input => {
    expect(parseOrder(input)).toBeNull();
  });
  it.each([150, null, undefined, { price: 150 }])('rejects a non-string order value %j', value => {
    expect(parseOrder(value)).toBeNull();
  });
  it('deletes an entry and reports absence on a subsequent status command', async () => {
    const fixture = setup(); fixture.seed(POSITION_KEY, position());
    expect((await dispatch(interaction({ data: { name: 'exit' } }), fixture)).body.type).toBe(5);
    await fixture.drain();
    expect(fixture.values.has(POSITION_KEY)).toBe(false);
    expect(fixture.kv.delete).toHaveBeenCalledWith(POSITION_KEY);
    await dispatch(interaction({ data: { name: 'position' } }), fixture); await fixture.drain();
    expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).content).toContain('登録されたポジションはありません');
  });
  it.each([true, false])('reports position status with cached rate available=%s', async hasRate => {
    const fixture = setup(); fixture.seed(POSITION_KEY, position());
    if (hasRate) fixture.seed('snapshot:rate', { data: rate(), timestamp: new Date(NOW).toISOString() });
    await dispatch(interaction({ data: { name: 'position' } }), fixture); await fixture.drain();
    const content = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).content;
    expect(content).toContain(hasRate ? '+2,000.00 円' : '参考レート未取得');
    expect(content).toContain('手数料・スプレッド・スワップ');
    expect(fixture.kv.put.mock.calls.filter(([key]) => key === POSITION_KEY)).toHaveLength(0);
  });
  it.each([
    [{ name: 'order', value: '0' }], [{ name: 'order', value: '-1' }], [{ name: 'order', value: '1000001' }],
    [{ name: 'order', value: '150 buy' }], [{ name: 'order', value: 150 }], [{ name: 'order', value: null }],
    [{ name: 'price', value: 150 }], undefined,
  ])('defers validation failure for option %j without overwriting the position', async option => {
    const fixture = setup(); fixture.seed(POSITION_KEY, position());
    const before = fixture.values.get(POSITION_KEY);
    const options = option === undefined ? undefined : [option];
    expect((await dispatch(interaction({ data: { name: 'entry', options } }), fixture)).body.type).toBe(5);
    await fixture.drain();
    expect(fixture.values.get(POSITION_KEY)).toBe(before);
    expect(fixture.kv.put.mock.calls.filter(([key]) => key === POSITION_KEY)).toHaveLength(0);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).content).toBe(ENTRY_USAGE);
  });
  it('rejects a nonfinite-looking order before persistence', async () => {
    const fixture = setup();
    expect(await command(interaction({ data: { name: 'entry', options: [{ name: 'order', value: 'Infinity long' }] } }), fixture.env)).toBe(ENTRY_USAGE);
    expect(fixture.kv.put).not.toHaveBeenCalled();
  });
  it('reports storage failures privately and does not expose exception details', async () => {
    const fixture = setup(); fixture.kv.put.mockRejectedValueOnce(new Error('private storage details'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await dispatch(interaction(), fixture); await fixture.drain();
    const content = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).content;
    expect(content).toContain('保存処理に失敗');
    expect(content).not.toContain('private');
  });
});
