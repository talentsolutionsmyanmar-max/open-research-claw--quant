/**
 * Quantrex Status Dashboard v0.1 — safe status data contract.
 *
 * READ-ONLY visibility surface only. This type is deliberately constructed so
 * it CANNOT carry execution-oriented plan data. It must not contain fields
 * named: entry, stop, sl, tp, target, rr, risk_reward, size, quantity,
 * leverage, order, side, reduce_only, client_order_id (enforced at runtime by
 * `guard.ts` and by the test suite).
 *
 * The dashboard never fetches live data, never renders a plan, and never
 * executes anything. The final hard-gate state is the only state that
 * controls dashboard eligibility.
 */

/** Final Quantrex Strategy-B operational state. The hard-gate result. */
export type OperationalState =
  | 'ENTRY_GO'
  | 'POSITION_MANAGE_ONLY'
  | 'MONITOR_ONLY';

/** Preliminary scanner state, before the final hard gate is applied. */
export type ScannerState =
  | 'GO'
  | 'NO_GO'
  | 'CAUTION'
  | 'MONITOR_ONLY'
  | 'SCAN_PENDING';

/**
 * A single read-only status observation for one instrument/venue.
 * Descriptive only — never imperative, never a trade instruction.
 *
 * Data invariant (enforced by guard.ts): when `finalOperationalState` is
 * `MONITOR_ONLY`, `runnableNow` MUST be `false`. A POSITION_MANAGE_ONLY record
 * observes an existing position only; it never describes a new/re-entry.
 */
export interface StatusRecord {
  /** Stable record identifier. */
  id: string;
  /** Traded instrument symbol, e.g. "XAUUSDT". */
  instrument: string;
  /** Exact venue, e.g. "BINANCE_FUTURES". */
  venue: string;
  /** Exact contract descriptor, e.g. "XAUUSDT TRADIFI_PERPETUAL". */
  contract: string;
  /** Preliminary scanner decision (pre hard-gate). */
  scannerState: ScannerState;
  /** Final operational state (post hard-gate). This is what wins. */
  finalOperationalState: OperationalState;
  /** Whether the final state is runnable right now. */
  runnableNow: boolean;
  /** When this status was generated, ISO-8601 UTC. */
  generatedAt: string;
  /** Exact blocker if the final state is not ENTRY_GO, else null. */
  finalBlocker: string | null;
  /** Descriptive, non-imperative display copy. Never a trade instruction. */
  displayAction: string;
  /** Provenance label for the source of this observation. */
  sourceLabel: string;
}

/**
 * A demo snapshot. v0.1 ships DEMO / FIXTURE ONLY — never live data, never a
 * live clock. Timestamps are static fixture values shown for provenance only.
 */
export interface DemoSnapshot {
  /** Visible non-live disclaimer. */
  label: string;
  /** Strategy name shown in the header. */
  strategyName: string;
  /** Static source-generated timestamp (ISO-8601 UTC). Provenance only — not a live clock. */
  sourceGeneratedAt: string;
  /** Candidate status records. */
  records: StatusRecord[];
  /** id of the record shown in the final-decision hero. */
  primaryId: string;
}
