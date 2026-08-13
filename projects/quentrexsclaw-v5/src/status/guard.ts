/**
 * Quantrex Status Dashboard v0.1 — fixture-field HYGIENE.
 *
 * NOT a formal execution-security barrier and NOT a safety proof. Residual
 * risk: this only validates the in-repo demo fixture and its rendered copy;
 * it does not protect against adversarial input and does not replace code
 * review or the architectural execution boundary (there is no execution code
 * to gate). Its sole purpose is to fail loudly during development if an
 * execution-oriented field or plan/imperative copy accidentally enters the
 * demo data.
 *
 * Design (deliberately narrow, to avoid false positives):
 *   1. A key ALLOWLIST. Only explicitly permitted keys may appear on a record
 *      or the snapshot. Any other key — including every execution-oriented
 *      alias (entryPrice, stopLoss, leverage, orderSide, clientOrderId, ...) —
 *      is rejected as unknown. This is whole-key matching only; it never does
 *      substring matching, so harmless words containing short execution-like
 *      fragments (e.g. "sidechain", "orderbook") are NOT falsely rejected.
 *   2. A rendered-copy validator with specific plan/imperative phrases.
 *   3. A data invariant: a MONITOR_ONLY record is never runnable.
 */
import type { DemoSnapshot, OperationalState, ScannerState, StatusRecord } from './types';

/** Exactly the keys permitted on a StatusRecord. */
export const ALLOWED_RECORD_KEYS: readonly string[] = [
  'id',
  'instrument',
  'venue',
  'contract',
  'scannerState',
  'finalOperationalState',
  'runnableNow',
  'generatedAt',
  'finalBlocker',
  'displayAction',
  'sourceLabel',
];

/** Exactly the keys permitted on a DemoSnapshot. */
export const ALLOWED_SNAPSHOT_KEYS: readonly string[] = [
  'label',
  'strategyName',
  'sourceGeneratedAt',
  'records',
  'primaryId',
];

export const OPERATIONAL_STATES: readonly OperationalState[] = [
  'ENTRY_GO',
  'POSITION_MANAGE_ONLY',
  'MONITOR_ONLY',
];

export const SCANNER_STATES: readonly ScannerState[] = [
  'GO',
  'NO_GO',
  'CAUTION',
  'MONITOR_ONLY',
  'SCAN_PENDING',
];

/**
 * Keys present on `obj` that are not in `allowed`. Non-recursive; matches whole
 * keys only (never value substrings). Returns [] when every key is permitted.
 */
export function findUnknownKeys(obj: unknown, allowed: readonly string[]): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const allowedSet = new Set(allowed);
  return Object.keys(obj as Record<string, unknown>).filter((key) => !allowedSet.has(key));
}

/** Specific plan/imperative phrases. Safe disclaimer negations do not match. */
export const UNSAFE_RENDER_COPY_PATTERNS: readonly RegExp[] = [
  /\bentry price\b/i,
  /\bstop[- ]?loss\b/i,
  /\btake[- ]?profit\b/i,
  /\btarget price\b/i,
  /\bTP\s?\d\b/,
  /\bSL\b/,
  /\bleverage\b/i,
  /\bposition size\b/i,
  /\bquantity\b/i,
  /\bR\s?[:/]\s?R\b/,
  /\brisk[- ]?reward\b/i,
  /\bgo long\b/i,
  /\bgo short\b/i,
  /\bopen (a |an )?(long|short|trade|position)\b/i,
  /\bplace (an? )?order\b/i,
  /\bbuy\b/i,
  /\bsell\b/i,
];

/** Return the list of unsafe patterns matched in `text` (empty when clean). */
export function findUnsafeRenderCopy(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of UNSAFE_RENDER_COPY_PATTERNS) {
    if (pattern.test(text)) matches.push(pattern.source);
  }
  return matches;
}

/** Throw if `text` contains plan/imperative vocabulary. */
export function assertRenderCopySafe(label: string, text: string): void {
  const matches = findUnsafeRenderCopy(text);
  if (matches.length > 0) {
    throw new Error(`[${label}] unsafe rendered copy matched: ${matches.join(', ')}`);
  }
}

/** ids of records that violate MONITOR_ONLY => runnableNow false. */
export function findInvariantViolations(
  records: ReadonlyArray<Pick<StatusRecord, 'id' | 'finalOperationalState' | 'runnableNow'>>
): string[] {
  const violations: string[] = [];
  for (const r of records) {
    if (r.finalOperationalState === 'MONITOR_ONLY' && r.runnableNow !== false) {
      violations.push(r.id);
    }
  }
  return violations;
}

/** Recursively gather every string value inside `value`. */
function collectStrings(value: unknown): string[] {
  const out: string[] = [];
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) out.push(...collectStrings(v));
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      out.push(...collectStrings(v));
    }
  }
  return out;
}

/**
 * Run every hygiene layer against a snapshot: key allowlist (snapshot + each
 * record), state validity, the MONITOR_ONLY runnable invariant, and
 * rendered-copy safety over all user-visible fixture strings.
 */
export function assertFixtureHygiene(snapshot: DemoSnapshot): void {
  const unknownTop = findUnknownKeys(snapshot, ALLOWED_SNAPSHOT_KEYS);
  if (unknownTop.length > 0) {
    throw new Error(`[fixture] unknown snapshot keys: ${unknownTop.join(', ')}`);
  }

  const unknownPerRecord: string[] = [];
  const badStates: string[] = [];
  for (const record of snapshot.records) {
    for (const key of findUnknownKeys(record, ALLOWED_RECORD_KEYS)) {
      unknownPerRecord.push(`${record.id}.${key}`);
    }
    if (!OPERATIONAL_STATES.includes(record.finalOperationalState)) {
      badStates.push(`${record.id}.finalOperationalState=${record.finalOperationalState}`);
    }
    if (!SCANNER_STATES.includes(record.scannerState)) {
      badStates.push(`${record.id}.scannerState=${record.scannerState}`);
    }
  }
  if (unknownPerRecord.length > 0) {
    throw new Error(`[fixture] unknown record keys: ${unknownPerRecord.join(', ')}`);
  }
  if (badStates.length > 0) {
    throw new Error(`[fixture] invalid state values: ${badStates.join(', ')}`);
  }

  const invariantViolations = findInvariantViolations(snapshot.records);
  if (invariantViolations.length > 0) {
    throw new Error(
      `[fixture] MONITOR_ONLY must not be runnable for: ${invariantViolations.join(', ')}`
    );
  }

  const unsafeCopy = findUnsafeRenderCopy(collectStrings(snapshot).join(' \n '));
  if (unsafeCopy.length > 0) {
    throw new Error(`[fixture] unsafe copy matched: ${unsafeCopy.join(', ')}`);
  }
}
