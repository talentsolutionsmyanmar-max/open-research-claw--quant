/**
 * Quantrex Status Dashboard v0.1 — forbidden-field guard tests.
 */
import {
  findForbiddenKeys,
  assertNoExecutionFields,
  FORBIDDEN_FIELD_NAMES,
} from './guard';

describe('forbidden-field guard', () => {
  it('flags every execution-oriented field name variant', () => {
    const poisoned = {
      entryPrice: 1,
      stopLoss: 2,
      sl: 3,
      tp1: 4,
      targetPrice: 5,
      rr: 6,
      size: 7,
      quantity: 8,
      leverage: 9,
      order: 10,
      side: 11,
      reduce_only: 12,
      client_order_id: 13,
    };
    const found = findForbiddenKeys(poisoned);
    expect(found).toEqual(
      expect.arrayContaining([
        'entryPrice',
        'stopLoss',
        'sl',
        'tp1',
        'targetPrice',
        'rr',
        'size',
        'quantity',
        'leverage',
        'order',
        'side',
        'reduce_only',
        'client_order_id',
      ])
    );
  });

  it('does not flag the clean dashboard schema', () => {
    const clean = {
      id: 'x',
      instrument: 'XAUUSDT',
      venue: 'BINANCE_FUTURES',
      contract: 'XAUUSDT TRADIFI_PERPETUAL',
      scannerState: 'GO',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:15:36Z',
      finalBlocker: null,
      displayAction: 'No bot-approved entry.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    };
    expect(findForbiddenKeys(clean)).toEqual([]);
  });

  it('walks nested objects and arrays', () => {
    const nested = { records: [{ ok: 1 }, { leverage: 5 }] };
    expect(findForbiddenKeys(nested)).toContain('records[1].leverage');
  });

  it('throws from assertNoExecutionFields on forbidden names', () => {
    expect(() => assertNoExecutionFields('test', { leverage: 5 })).toThrow();
  });

  it('does not throw from assertNoExecutionFields on clean data', () => {
    expect(() => assertNoExecutionFields('test', { instrument: 'X' })).not.toThrow();
  });

  it('exposes the full forbidden token list', () => {
    expect(FORBIDDEN_FIELD_NAMES.length).toBe(14);
  });
});
