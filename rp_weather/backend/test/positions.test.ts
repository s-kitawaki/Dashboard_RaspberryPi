import { describe, expect, it } from 'vitest';
import { positionText, profit, signed } from '../src/positions';
import { position } from './helpers';

describe('position valuation', () => {
  it.each([
    ['long', 153, 3, 2, 3000], ['long', 147, -3, -2, -3000],
    ['short', 147, 3, 2, 3000], ['short', 153, -3, -2, -3000],
  ] as const)('%s at %s calculates direction, percentage and quantity', (side, current, difference, percent, yen) => {
    expect(profit(position({ side }), current)).toEqual({ difference, percent, yen });
  });
  it('keeps per-USD valuation when quantity is unknown', () => {
    const p = position({ quantity: null });
    expect(profit(p, 153)).toEqual({ difference: 3, percent: 2, yen: null });
    expect(positionText(p, 153)).toContain('1 USDあたり');
    expect(positionText(p, 153)).toContain('+3.000 円/USD (+2.00%)');
    expect(positionText(p, 153)).not.toContain('評価損益:');
  });
  it('supports fractional quantity and a flat price', () => {
    expect(profit(position({ quantity: 2.5 }), 151).yen).toBe(2.5);
    expect(profit(position(), 150)).toEqual({ difference: 0, percent: 0, yen: 0 });
  });
  it('formats trade side, quantity and optional valuation', () => {
    expect(positionText(position({ side: 'short' }), 147)).toContain('150.000 円 / 売り');
    expect(positionText(position(), 153)).toContain('評価損益: +3,000.00 円');
    expect(positionText(position())).not.toContain('損益幅:');
    expect(signed(-1234.56, 2)).toBe('-1,234.56');
  });
  it('formats a negative amount rounded to zero without a double sign', () => {
    expect(signed(-0.0001)).toBe('+0.000');
  });
});
