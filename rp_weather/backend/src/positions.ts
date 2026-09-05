import type { Position } from './types';

export function profit(position: Position, current: number) {
  const difference = (current - position.price) * (position.side === 'short' ? -1 : 1);
  return { difference, percent: difference / position.price * 100, yen: position.quantity === null ? null : difference * position.quantity };
}
export function signed(value: number, digits = 3) {
  const rounded = Number(value.toFixed(digits)) || 0;
  return `${rounded >= 0 ? '+' : ''}${rounded.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
export function positionText(position: Position, current?: number): string {
  let result = `エントリー: ${position.price.toFixed(3)} 円 / ${position.side === 'long' ? '買い' : '売り'}\n数量: ${position.quantity === null ? '未設定（1 USDあたりの損益を表示）' : `${position.quantity.toLocaleString('ja-JP')} USD`}`;
  if (current !== undefined) {
    const p = profit(position, current);
    result += `\n損益幅: ${signed(p.difference)} 円/USD (${signed(p.percent, 2)}%)`;
    if (p.yen !== null) result += `\n評価損益: ${signed(p.yen, 2)} 円`;
  }
  return result;
}
