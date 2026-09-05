import { forecast, quote, weather } from './providers';
import { interactions } from './discord';
import { profit, signed } from './positions';
import { POSITION_KEY, type Env, type Position, type Quote, type Snapshot } from './types';

async function save(env: Env, name: string, data: unknown) {
  await env.DASHBOARD_KV.put(`snapshot:${name}`, JSON.stringify({ data, timestamp: new Date().toISOString() }));
}

function jstDateTime(timestamp: number): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function positionNotification(position: Position, current: number): string[] {
  const result = profit(position, current);
  const icon = result.difference >= 0 ? '📈' : '📉';
  return [
    '💰 **ポジション損益状況**',
    `保有単価： ${position.price.toFixed(3)} 円（${position.side === 'long' ? '買い' : '売り'}）`,
    `損益幅\u3000： ${icon} ${signed(result.difference)} 円/USD`,
  ];
}

export async function notify(env: Env, current: Quote, scheduledTime: number) {
  const hourKey = `notified:${Math.floor(scheduledTime / 3_600_000)}`;
  if (await env.DASHBOARD_KV.get(hourKey)) return;
  const [position, previous] = await Promise.all([
    env.DASHBOARD_KV.get<Position>(POSITION_KEY, 'json'),
    env.DASHBOARD_KV.get<{ price: number }>('notification:last', 'json'),
  ]);
  const separator = '------------------------------';
  const positionSection = position ? [...positionNotification(position, current.exchange_rate), separator] : [];
  const content = [
    ...positionSection,
    `📈 現在価格（参考値）： ${current.exchange_rate.toFixed(3)} 円`,
    `🔄 前回比（前回通知時）： ${previous ? `${signed(current.exchange_rate - previous.price)} 円` : '初回通知'}`,
    '',
    '💱 **USD/JPY 為替通知**',
    `📅 取得日時： ${jstDateTime(scheduledTime)}`,
    separator,
    `始値： ${current.open.toFixed(3)}`,
    `高値： ${current.high.toFixed(3)}`,
    `安値： ${current.low.toFixed(3)}`,
    separator,
  ].join('\n');
  if (!/^https:\/\/discord\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w.-]+$/.test(env.DISCORD_WEBHOOK_URL)) throw new Error('Webhook configuration invalid');
  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Notification HTTP ${response.status}`);
  // Commit comparison state only after Discord accepts the message.
  await env.DASHBOARD_KV.put(hourKey, 'sent', { expirationTtl: 172800 });
  await env.DASHBOARD_KV.put('notification:last', JSON.stringify({ price: current.exchange_rate }));
}
export async function refresh(env: Env, scheduledTime: number) {
  const results = await Promise.allSettled([
    weather(env).then(data => save(env, 'weather', data)),
    forecast(env).then(data => save(env, 'forecast', data)),
    (async () => {
      const current = await quote(env);
      const previous = await env.DASHBOARD_KV.get<Snapshot<Quote>>('snapshot:rate', 'json');
      current.exchange_diff = previous ? current.exchange_rate - previous.data.exchange_rate : null;
      await save(env, 'rate', current);
      await notify(env, current, scheduledTime);
    })(),
  ]);
  const failures = results.flatMap((result, index) => {
    if (result.status !== 'rejected') return [];
    const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
    return [`${['weather', 'forecast', 'rate/notification'][index]}: ${reason}`];
  });
  if (failures.length) {
    console.error(`Scheduled refresh failed: ${failures.join(', ')}`);
    throw new Error(`Scheduled refresh failed: ${failures.join(', ')}`);
  }
}
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/discord/interactions' && request.method === 'POST') return interactions(request, env, ctx);
    const match = /^\/api\/(weather|forecast|rate)$/.exec(path);
    if (!match) return Response.json({ message: 'Not found' }, { status: 404 });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
    try {
      const snapshot = await env.DASHBOARD_KV.get<Snapshot<unknown>>(`snapshot:${match[1]}`, 'json');
      if (!snapshot) return Response.json({ status: 'error', message: '初回の定時更新を待っています。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      return Response.json({ status: 'success', ...snapshot, stale: Date.now() - Date.parse(snapshot.timestamp) > 90 * 60_000 }, { headers: { 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
    } catch {
      return Response.json({ status: 'error', message: 'データを読み込めませんでした。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  },
  async scheduled(event: ScheduledController, env: Env): Promise<void> {
    await refresh(env, event.scheduledTime);
  },
} satisfies ExportedHandler<Env>;
