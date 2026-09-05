import { POSITION_KEY, type Env, type Position, type Quote, type Snapshot } from './types';
import { positionText } from './positions';

interface Interaction {
  id: string; application_id: string; token: string; type: number;
  guild_id?: string; channel_id?: string; member?: { user?: { id: string } };
  data?: { name: string; options?: { name: string; value: unknown }[] };
}
function hex(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], byte => parseInt(byte, 16));
}
export async function verify(request: Request, body: string, publicKey: string): Promise<boolean> {
  const signature = request.headers.get('X-Signature-Ed25519') ?? '';
  const timestamp = request.headers.get('X-Signature-Timestamp') ?? '';
  if (!/^[a-f\d]{128}$/i.test(signature) || !/^[a-f\d]{64}$/i.test(publicKey) || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hex(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hex(signature), new TextEncoder().encode(timestamp + body));
  } catch { return false; }
}
const reply = (content: string) => Response.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

export async function command(interaction: Interaction, env: Env): Promise<string> {
  const name = interaction.data?.name;
  if (name === 'entry') {
    const options = Object.fromEntries((interaction.data?.options ?? []).map(x => [x.name, x.value]));
    const price = options.price;
    const quantity = options.quantity ?? null;
    const side = options.side ?? 'long';
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 1_000_000 ||
      (quantity !== null && (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000_000)) ||
      (side !== 'long' && side !== 'short')) return '価格・数量は正の数、売買方向は long / short を指定してください。';
    const position: Position = { price, quantity, side, updatedAt: new Date().toISOString(), updatedBy: interaction.member!.user!.id };
    await env.DASHBOARD_KV.put(POSITION_KEY, JSON.stringify(position));
    return `登録しました。既存ポジションは置き換わります。\n${positionText(position)}\n通知への反映に60秒以上かかる場合があります。`;
  }
  if (name === 'exit') {
    await env.DASHBOARD_KV.delete(POSITION_KEY);
    return 'ポジションを削除しました。通知への反映に60秒以上かかる場合があります。';
  }
  if (name === 'position') {
    const [position, rate] = await Promise.all([
      env.DASHBOARD_KV.get<Position>(POSITION_KEY, 'json'),
      env.DASHBOARD_KV.get<Snapshot<Quote>>('snapshot:rate', 'json'),
    ]);
    if (!position) return '登録されたポジションはありません。';
    return `${positionText(position, rate?.data.exchange_rate)}\n${rate ? `参考レート時刻: ${rate.data.as_of}` : '参考レート未取得'}\n手数料・スプレッド・スワップを含まない参考評価額です。`;
  }
  return '未対応のコマンドです。';
}
async function finish(interaction: Interaction, env: Env) {
  let content: string;
  try {
    const key = `interaction:${interaction.id}`;
    const previous = await env.DASHBOARD_KV.get(key);
    if (previous !== null) content = previous;
    else {
      content = await command(interaction, env);
      // Best effort replay protection; KV is not an atomic lock.
      await env.DASHBOARD_KV.put(key, content, { expirationTtl: 900 });
    }
  }
  catch { console.error('Discord command storage failed'); content = '保存処理に失敗しました。/position で状態を確認してから再実行してください。'; }
  // Token comes only from a signature-verified Discord interaction.
  const response = await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Discord response HTTP ${response.status}`);
}
export async function interactions(request: Request, env: Env, ctx: ExecutionContext) {
  const body = await request.text();
  if (!await verify(request, body, env.DISCORD_PUBLIC_KEY)) return new Response('Invalid signature', { status: 401 });
  let interaction: Interaction;
  try { interaction = JSON.parse(body); } catch { return new Response('Invalid JSON', { status: 400 }); }
  if (interaction.type === 1) return Response.json({ type: 1 });
  const user = interaction.member?.user?.id;
  const allowed = env.DISCORD_ALLOWED_USER_IDS.split(',').map(x => x.trim()).filter(Boolean);
  if (!env.DISCORD_GUILD_ID || !env.DISCORD_CHANNEL_ID || !user ||
      interaction.guild_id !== env.DISCORD_GUILD_ID || interaction.channel_id !== env.DISCORD_CHANNEL_ID || !allowed.includes(user)) {
    return reply('このサーバー・チャンネル・ユーザーには操作権限がありません。');
  }
  if (interaction.type !== 2) return reply('未対応の操作です。');
  if (!/^\d+$/.test(interaction.id) || !/^\d+$/.test(interaction.application_id) || !/^[\w.-]+$/.test(interaction.token)) return new Response('Invalid interaction', { status: 400 });
  ctx.waitUntil(finish(interaction, env).catch(() => { console.error('Discord command reply failed'); }));
  // Acknowledge within Discord's 3-second deadline; perform KV I/O afterwards.
  return Response.json({ type: 5, data: { flags: 64 } });
}
