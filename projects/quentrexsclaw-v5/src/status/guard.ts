/**
 * Quantrex Status Dashboard v0.1 — forbidden-field guard.
 *
 * The dashboard is a read-only visibility surface. It must never carry
 * execution-oriented plan data. This module enforces that invariant at
 * runtime over the fixture and is also exercised by the test suite.
 *
 * A field NAME is forbidden when its lower-cased form equals — or contains as
 * a substring — any of the tokens below. Substring matching catches common
 * variants (e.g. entryPrice -> "entry", stopLoss -> "stop", orderSide ->
 * "order"/"side", clientOrderId -> "order").
 */
export const FORBIDDEN_FIELD_NAMES: readonly string[] = [
  'entry',
  'stop',
  'sl',
  'tp',
  'target',
  'rr',
  'risk_reward',
  'size',
  'quantity',
  'leverage',
  'order',
  'side',
  'reduce_only',
  'client_order_id',
];

/**
 * Recursively collect the paths of any object keys whose names match a
 * forbidden token. Returns an empty array for clean data.
 */
export function findForbiddenKeys(value: unknown, path = ''): string[] {
  const found: string[] = [];

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      found.push(...findForbiddenKeys(value[i], `${path}[${i}]`));
    }
    return found;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const lower = String(key).toLowerCase();
      if (FORBIDDEN_FIELD_NAMES.some((token) => lower === token || lower.includes(token))) {
        found.push(path ? `${path}.${key}` : key);
      }
      found.push(...findForbiddenKeys(child, path ? `${path}.${key}` : key));
    }
  }

  return found;
}

/**
 * Throw if the supplied value contains any forbidden field name. Used as a
 * runtime self-check on the demo fixture so an accidental regression fails
 * loudly instead of silently rendering plan data.
 */
export function assertNoExecutionFields(label: string, value: unknown): void {
  const found = findForbiddenKeys(value);
  if (found.length > 0) {
    throw new Error(
      `[${label}] forbidden execution-oriented field names detected: ${found.join(', ')}`
    );
  }
}
