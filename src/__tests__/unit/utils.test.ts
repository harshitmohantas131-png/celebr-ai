import { describe, it, expect } from 'vitest';
import { formatCurrency, clamp } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats a round number correctly', () => {
    expect(formatCurrency(1500)).toBe('$1,500.00');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('supports alternate currency', () => {
    const result = formatCurrency(100, 'en-GB', 'GBP');
    expect(result).toContain('100');
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
