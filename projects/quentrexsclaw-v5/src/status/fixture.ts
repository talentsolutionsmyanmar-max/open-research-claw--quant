/**
 * Quantrex Status Dashboard v0.1 — DEMO / FIXTURE ONLY.
 *
 * This is NOT live data. There is no remote fetch in this slice. The fixture
 * is a small static, typed snapshot used to render a read-only visibility
 * surface. It is visibly labeled DEMO SNAPSHOT — NOT LIVE — NOT TRADE
 * INSTRUCTION in the UI.
 *
 * The runtime guard below fails loudly if this fixture ever gains an
 * execution-oriented field name.
 */
import { assertNoExecutionFields } from './guard';
import type { DemoSnapshot } from './types';

export const FIXTURE: DemoSnapshot = {
  label: 'DEMO SNAPSHOT — NOT LIVE — NOT TRADE INSTRUCTION',
  strategyName: 'Quantrex Strategy-B',
  sourceGeneratedAt: '2026-08-13T08:15:36Z',
  staleThresholdMs: 15 * 60 * 1000, // 15 minutes
  primaryId: 'xauusdt-binance-tradifi',
  records: [
    {
      id: 'xauusdt-binance-tradifi',
      instrument: 'XAUUSDT',
      venue: 'BINANCE_FUTURES',
      contract: 'XAUUSDT TRADIFI_PERPETUAL',
      // Preliminary scanner said GO ...
      scannerState: 'GO',
      // ... but the final hard gate downgraded it to MONITOR_ONLY.
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:15:36Z',
      finalBlocker:
        'Hyperliquid confirmation unavailable; final hard gate does not permit GO.',
      displayAction: 'No bot-approved entry.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
    {
      id: 'solusdc-mix',
      instrument: 'SOLUSDC',
      venue: 'MIX',
      contract: 'SOLUSDC PERPETUAL',
      scannerState: 'MONITOR_ONLY',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:14:02Z',
      finalBlocker: 'Prior plan expired; primary venue MIX.',
      displayAction: 'Monitoring only — no active plan.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
    {
      id: 'avaxusdt-binance-caution',
      instrument: 'AVAXUSDT',
      venue: 'BINANCE_FUTURES',
      contract: 'AVAXUSDT PERPETUAL',
      scannerState: 'CAUTION',
      finalOperationalState: 'MONITOR_ONLY',
      runnableNow: false,
      generatedAt: '2026-08-13T08:16:55Z',
      finalBlocker: 'Liquidity confirmation weak.',
      displayAction: 'Monitoring only — confirmation insufficient.',
      sourceLabel: 'Quantrex Strategy-B engine (DEMO fixture)',
    },
  ],
};

// Runtime self-check: the demo fixture must never contain execution fields.
assertNoExecutionFields('FIXTURE', FIXTURE);
