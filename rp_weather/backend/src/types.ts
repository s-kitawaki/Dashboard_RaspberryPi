export interface Env {
  DASHBOARD_KV: KVNamespace;
  OPENWEATHER_API_KEY: string;
  TWELVE_DATA_API_KEY: string;
  DISCORD_WEBHOOK_URL: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_GUILD_ID: string;
  DISCORD_CHANNEL_ID: string;
  DISCORD_ALLOWED_USER_IDS: string;
  LATITUDE: string;
  LONGITUDE: string;
}
export interface Quote {
  exchange_rate: number;
  exchange_diff: number | null;
  as_of: string;
  open: number;
  high: number;
  low: number;
}
export interface Position {
  price: number;
  side: 'long' | 'short';
  quantity: number | null;
  updatedAt: string;
  updatedBy: string;
}
export interface Snapshot<T> { data: T; timestamp: string }
export const POSITION_KEY = 'position:USDJPY';
