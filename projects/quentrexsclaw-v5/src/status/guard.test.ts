/**
 * Quantrex Status Dashboard v0.1 — fixture-field hygiene tests.
 *
 * The guard is fixture-field HYGIENE, not a formal execution-security barrier
 * (residual risk: it only covers the demo fixture and rendered copy; it does
 * not protect against adversarial input and does not replace review). These
 * tests verify the hygiene behaviour:
 *   - a narrow allowlist rejects unknown / execution-oriented fields (incl. aliases);
 *   - a rendered-copy validator rejects plan/imperative vocabulary;
 *   - a data invariant keeps MONITOR_ONLY non-runnable.
 *
 * It deliberately does NOT use broad substring matching on values, so harmless
 * terms that merely contain a short execution-like substring are not rejected.
 */
import {
  ALLOWED_RECORD_KEYS,
  ALLOWED_SNAPSHOT_KEYS,
  findUnknownKeys,
  findUnsafeRenderCopy,
  findInvariantViolations,
  assertFixtureHygiene,
  assertRenderCopySafe,
} from './guard';
import { FIXTURE } from './fixture';

describe('fixture-field hygiene (allowlist + rendered-copy)', () => {
  it('rejects execution-oriented field aliases via the allowlist', () => {
    const poisoned = {
      id: 'x',
      instrument: 'X',
      venue: 'V',
      contract: 'C',
      scannerState: 'GO',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: 't',
      finalBlocker: null,
      displayAction: 'a',
      sourceLabel: 's',
      // execution-oriented aliases — none are permitted keys:
      entryPrice: 1,
      stopLoss: 2,
      sl: 3,
      tp1: 4,
      targetPrice: 5,
      rr: 6,
      size: 7,
      quantity: 8,
      leverage: 9,
      orderSide: 10,
      reduceOnly: 11,
      clientOrderId: 12,
    };
    const unknown = findUnknownKeys(poisoned, ALLOWED_RECORD_KEYS);
    expect(unknown).toEqual(
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
        'orderSide',
        'reduceOnly',
        'clientOrderId',
      ])
    );
  });

  it('rejects an unknown but harmless key via the allowlist', () => {
    const withUnknown = {
      id: 'x',
      instrument: 'X',
      venue: 'V',
      contract: 'C',
      scannerState: 'GO',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: 't',
      finalBlocker: null,
      displayAction: 'a',
      sourceLabel: 's',
      surpriseExtra: 1,
    };
    expect(findUnknownKeys(withUnknown, ALLOWED_RECORD_KEYS)).toContain('surpriseExtra');
  });

  it('accepts the clean record schema', () => {
    const clean = {
      id: 'x',
      instrument: 'X',
      venue: 'V',
      contract: 'C',
      scannerState: 'GO',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: 't',
      finalBlocker: null,
      displayAction: 'a',
      sourceLabel: 's',
    };
    expect(findUnknownKeys(clean, ALLOWED_RECORD_KEYS)).toEqual([]);
  });

  it('accepts the clean snapshot schema', () => {
    expect(findUnknownKeys(FIXTURE, ALLOWED_SNAPSHOT_KEYS)).toEqual([]);
  });

  it('inspects keys only — values containing execution-like substrings are not flagged', () => {
    // Allowlist matching is on whole keys, never on value substrings, so values
    // like "sidechain" or "orderbook" do not trigger false rejections.
    const harmlessValues = {
      id: 'x',
      instrument: 'sidechain-XYZ',
      venue: 'orderbook-view',
      contract: 'C',
      scannerState: 'GO',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: 't',
      finalBlocker: 'consolidation, no change',
      displayAction: 'monitoring',
      sourceLabel: 's',
    };
    expect(findUnknownKeys(harmlessValues, ALLOWED_RECORD_KEYS)).toEqual([]);
  });

  it('flags unsafe rendered copy', () => {
    const unsafe =
      'Entry price 100, stop loss 90, take profit 120, leverage 10x, go long now, BUY immediately';
    expect(findUnsafeRenderCopy(unsafe).length).toBeGreaterThan(0);
  });

  it('passes safe copy including disclaimer negations', () => {
    const safe =
      'It does not execute trades and is not a trade instruction. Monitoring only. ENTRY_GO final state shown for visibility; this surface performs no execution.';
    expect(findUnsafeRenderCopy(safe)).toEqual([]);
  });

  it('enforces the MONITOR_ONLY => runnableNow false invariant', () => {
    expect(
      findInvariantViolations([
        { id: 'a', finalOperationalState: 'MONITOR_ONLY', runnableNow: false },
      ])
    ).toEqual([]);
    expect(
      findInvariantViolations([
        { id: 'a', finalOperationalState: 'MONITOR_ONLY', runnableNow: true },
      ])
    ).toContain('a');
  });

  it('the shipped fixture passes full hygiene (allowlist, states, invariant, copy)', () => {
    expect(() => assertFixtureHygiene(FIXTURE)).not.toThrow();
  });

  it('throws on unsafe render copy', () => {
    expect(() => assertRenderCopySafe('test', 'leverage 10x, BUY')).toThrow();
  });

  it('does not throw on safe render copy', () => {
    expect(() => assertRenderCopySafe('test', 'Monitoring only.')).not.toThrow();
  });
});
