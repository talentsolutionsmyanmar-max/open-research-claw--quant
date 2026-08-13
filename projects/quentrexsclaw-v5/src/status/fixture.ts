/**
 * Quantrex Status Dashboard v0.1 — DEMO / FIXTURE ONLY.
 *
 * NOT live data. NOT a live clock. There is no remote fetch in this slice.
 * Timestamps are static fixture values shown for provenance only.
 *
 * Visibly labeled DEMO SNAPSHOT — NOT LIVE — NOT TRADE INSTRUCTION.
 *
 * The runtime hygiene check (`assertFixtureHygiene`) fails loudly if this
 * fixture ever gains an unknown field, an invalid state, a
 * MONITOR_ONLY-runnable violation, or plan/imperative copy.
 */
import { assertFixtureHygiene } from './guard';
import type { DemoSnapshot } from './types';

export const FIXTURE: DemoSnapshot = {
  label: 'DEMO SNAPSHOT — NOT LIVE — NOT TRADE INSTRUCTION',
  strategyName: 'Quantrex Strategy-B',
  sourceGeneratedAt: '2026-08-13T08:15:36Z',
  primaryId: 'xauusdt-binance-tradifi',
  records: [
    {
      // Scanner GO downgraded by the final hard gate -> no executable content.
      id: 'xauusdt-binance-tradifi',
      instrument: 'XAUUSDT',
      venue: 'BINANCE_FUTURES',
      contract: 'XAUUSDT TRADIFI_PERPETUAL',
      scannerState: 'GO',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:15:36Z',
      finalBlocker:
        'Hyperliquid confirmation unavailable; final hard gate does not permit GO.',
      displayAction: 'Monitoring only.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
    {
      // ENTRY_GO coverage: visibility only. No plan details, no execution.
      id: 'btcusdt-binance-perp',
      instrument: 'BTCUSDT',
      venue: 'BINANCE_FUTURES',
      contract: 'BTCUSDT PERPETUAL',
      scannerState: 'GO',
      finalOperationalState: 'ENTRY_GO',
      runnableNow: true,
      generatedAt: '2026-08-13T08:15:36Z',
      finalBlocker: null,
      displayAction:
        'ENTRY_GO final state shown for visibility. No plan details are displayed; this surface performs no execution.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
    {
      // POSITION_MANAGE_ONLY coverage: observes an existing position only.
      // Never describes a new entry, re-entry, add, averaging, or reversal.
      id: 'ethusdc-mix-manage',
      instrument: 'ETHUSDC',
      venue: 'MIX',
      contract: 'ETHUSDC PERPETUAL',
      scannerState: 'NO_GO',
      finalOperationalState: 'POSITION_MANAGE_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:14:02Z',
      finalBlocker: 'Existing position; management observation only.',
      displayAction: 'Existing position under management.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
    {
      // SOLUSDC: MONITOR_ONLY; primary venue MIX (prior-plan wording removed).
      id: 'solusdc-mix',
      instrument: 'SOLUSDC',
      venue: 'MIX',
      contract: 'SOLUSDC PERPETUAL',
      scannerState: 'MONITOR_ONLY',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:16:55Z',
      finalBlocker: 'Primary venue MIX; not eligible.',
      displayAction: 'Monitoring only.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
  ],
};

// Runtime self-check: the demo fixture must satisfy every hygiene rule.
assertFixtureHygiene(FIXTURE);
