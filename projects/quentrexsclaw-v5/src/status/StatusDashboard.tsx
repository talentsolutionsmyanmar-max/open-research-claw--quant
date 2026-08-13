/**
 * Quantrex Status Dashboard v0.1 — read-only visibility surface.
 *
 * NOT a trading terminal. NOT a signal generator. NOT an execution surface.
 *
 * One rule dominates the UI: FINAL HARD GATE WINS. The final operational
 * state is always shown as more authoritative than the preliminary scanner
 * state; a scanner GO that the final hard gate downgrades is marked
 * DOWNGRADED and never yields a plan.
 *
 * v0.1 renders DEMO / FIXTURE ONLY. There is no live fetch in this slice.
 */
import { useMemo, useState } from 'react';
import { FIXTURE } from './fixture';
import type { OperationalState, StatusRecord } from './types';
import './StatusDashboard.css';

interface StatusDashboardProps {
  /** Reference "now" in epoch ms. Defaults to Date.now(). Injectable for tests. */
  now?: number;
}

const FINAL_STATE_LABEL: Record<OperationalState, string> = {
  ENTRY_GO: 'ENTRY_GO',
  POSITION_MANAGE_ONLY: 'POSITION_MANAGE_ONLY',
  MONITOR_ONLY: 'MONITOR_ONLY',
};

/** True when a preliminary scanner GO was overridden by the final hard gate. */
function isDowngraded(record: StatusRecord): boolean {
  return record.scannerState === 'GO' && record.finalOperationalState !== 'ENTRY_GO';
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

export default function StatusDashboard({ now }: StatusDashboardProps) {
  const nowMs = now ?? Date.now();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const primary = useMemo(
    () => FIXTURE.records.find((r) => r.id === FIXTURE.primaryId) ?? FIXTURE.records[0],
    []
  );
  const selected = useMemo(
    () => FIXTURE.records.find((r) => r.id === selectedId) ?? null,
    [selectedId]
  );

  const snapshotAgeMs = nowMs - new Date(FIXTURE.sourceGeneratedAt).getTime();
  const snapshotStale = snapshotAgeMs > FIXTURE.staleThresholdMs;
  const primaryDowngraded = isDowngraded(primary);

  return (
    <div className="qsdb">
      {/* ── 1. TOP STATUS STRIP ── */}
      <header className="qsdb-topbar">
        <div className="qsdb-topbar-left">
          <h1 className="qsdb-strategy">{FIXTURE.strategyName}</h1>
          <span className="qsdb-demo-badge" data-testid="demo-badge">
            {FIXTURE.label}
          </span>
        </div>
        <div className="qsdb-topbar-right">
          <div className="qsdb-meta">
            <span className="qsdb-meta-label">Source generated</span>
            <span className="qsdb-meta-value">{formatUtc(FIXTURE.sourceGeneratedAt)}</span>
          </div>
          <div className="qsdb-meta">
            <span className="qsdb-meta-label">Age</span>
            <span className="qsdb-meta-value">{formatDuration(snapshotAgeMs)} old</span>
          </div>
          <span
            className={`qsdb-freshness ${snapshotStale ? 'is-stale' : 'is-fresh'}`}
            aria-label={`Source ${snapshotStale ? 'stale' : 'fresh'}`}
          >
            {snapshotStale ? 'STALE' : 'FRESH'}
          </span>
        </div>
      </header>

      <p className="qsdb-not-live-note">
        This is a static demo snapshot. It is not live data and is not a trade instruction.
      </p>

      {/* ── 2. FINAL DECISION HERO ── */}
      <section className="qsdb-hero" aria-label="Final decision">
        <div className="qsdb-hero-headline">
          <span className="qsdb-hero-eyebrow">Final operational state</span>
          <span
            className={`qsdb-state-badge qsdb-state-${primary.finalOperationalState}`}
            data-testid="hero-final-state"
          >
            <span aria-hidden="true">◆</span> {FINAL_STATE_LABEL[primary.finalOperationalState]}
          </span>
        </div>

        <div className="qsdb-hero-grid">
          <div className="qsdb-hero-cell">
            <span className="qsdb-cell-label">Runnable</span>
            <span
              className={`qsdb-runnable ${primary.runnableNow ? 'is-yes' : 'is-no'}`}
              data-testid="hero-runnable"
            >
              Runnable: {primary.runnableNow ? 'true' : 'false'}
            </span>
          </div>
          <div className="qsdb-hero-cell">
            <span className="qsdb-cell-label">Instrument</span>
            <span className="qsdb-cell-value">
              {primary.instrument} · {primary.venue}
            </span>
          </div>
          <div className="qsdb-hero-cell">
            <span className="qsdb-cell-label">Contract</span>
            <span className="qsdb-cell-value">{primary.contract}</span>
          </div>
        </div>

        {primaryDowngraded && (
          <div className="qsdb-downgrade-banner">
            <strong>DOWNGRADED.</strong> Scanner returned GO; the final hard gate set the
            operational state to {FINAL_STATE_LABEL[primary.finalOperationalState]}. Final hard
            gate wins.
          </div>
        )}

        <p className="qsdb-display-action">{primary.displayAction}</p>
      </section>

      {/* ── 3. CANDIDATE TABLE ── */}
      <section className="qsdb-table-wrap" aria-label="Candidate status table">
        <table className="qsdb-table">
          <thead>
            <tr>
              <th scope="col">Instrument</th>
              <th scope="col">Venue / Contract</th>
              <th scope="col">Scanner State</th>
              <th scope="col">Final State</th>
              <th scope="col">Runnable</th>
              <th scope="col">Final Blocker</th>
              <th scope="col">Generated / Age</th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE.records.map((record) => {
              const ageMs = nowMs - new Date(record.generatedAt).getTime();
              const downgraded = isDowngraded(record);
              return (
                <tr key={record.id} className={downgraded ? 'qsdb-row-downgraded' : ''}>
                  <th scope="row">
                    <button
                      type="button"
                      className="qsdb-instrument-trigger"
                      aria-label={`Details for ${record.instrument}`}
                      onClick={() => setSelectedId(record.id)}
                    >
                      <span>{record.instrument}</span>
                      <span aria-hidden="true" className="qsdb-chevron">›</span>
                    </button>
                  </th>
                  <td>
                    <div className="qsdb-venue">{record.venue}</div>
                    <div className="qsdb-contract">{record.contract}</div>
                  </td>
                  <td>
                    <span className="qsdb-scanner">{record.scannerState}</span>
                  </td>
                  <td>
                    <span
                      className={`qsdb-state-badge qsdb-state-${record.finalOperationalState} qsdb-final`}
                    >
                      {FINAL_STATE_LABEL[record.finalOperationalState]}
                    </span>
                    {downgraded && (
                      <span className="qsdb-downgrade-tag" aria-label="Downgraded by final hard gate">
                        DOWNGRADED
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`qsdb-runnable ${record.runnableNow ? 'is-yes' : 'is-no'}`}>
                      {record.runnableNow ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className="qsdb-blocker">{record.finalBlocker ?? '—'}</span>
                  </td>
                  <td>
                    <div className="qsdb-gen">{formatUtc(record.generatedAt)}</div>
                    <div className="qsdb-age">{formatDuration(ageMs)} old</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── 4. DETAIL PANEL (read-only provenance) ── */}
      <section className="qsdb-detail" aria-label="Candidate detail">
        {selected ? (
          <DetailPanel record={selected} nowMs={nowMs} staleThresholdMs={FIXTURE.staleThresholdMs} />
        ) : (
          <p className="qsdb-detail-prompt">
            Select a candidate instrument to view its read-only provenance. Final hard gate wins.
          </p>
        )}
      </section>

      {/* ── 5. SAFETY FOOTER ── */}
      <footer className="qsdb-footer">
        Planning-status dashboard only. It does not execute trades and is not a trade instruction.
        Final hard-gate state controls dashboard eligibility.
      </footer>
    </div>
  );
}

interface DetailPanelProps {
  record: StatusRecord;
  nowMs: number;
  staleThresholdMs: number;
}

function DetailPanel({ record, nowMs, staleThresholdMs }: DetailPanelProps) {
  const ageMs = nowMs - new Date(record.generatedAt).getTime();
  const stale = ageMs > staleThresholdMs;
  const downgraded = isDowngraded(record);

  return (
    <div className="qsdb-detail-body">
      <div className="qsdb-detail-head">
        <h2 className="qsdb-detail-title">
          {record.instrument} · {record.contract}
        </h2>
        <span
          className={`qsdb-freshness ${stale ? 'is-stale' : 'is-fresh'}`}
          aria-label={`Record ${stale ? 'stale' : 'fresh'}`}
        >
          {stale ? 'STALE' : 'FRESH'}
        </span>
      </div>

      <p className="qsdb-detail-rule">Final hard gate wins.</p>

      <dl className="qsdb-detail-grid">
        <dt>Source timestamp</dt>
        <dd>{formatUtc(record.generatedAt)}</dd>

        <dt>Age</dt>
        <dd>{formatDuration(ageMs)} old</dd>

        <dt>Freshness</dt>
        <dd>{stale ? 'Stale — exceeds threshold' : 'Fresh — within threshold'}</dd>

        <dt>Scanner decision</dt>
        <dd>
          <span className="qsdb-scanner">{record.scannerState}</span>
        </dd>

        <dt>Final decision</dt>
        <dd>
          <span className={`qsdb-state-badge qsdb-state-${record.finalOperationalState} qsdb-final`}>
            {FINAL_STATE_LABEL[record.finalOperationalState]}
          </span>
          {downgraded && <span className="qsdb-downgrade-tag"> DOWNGRADED</span>}
        </dd>

        <dt>Runnable</dt>
        <dd>{record.runnableNow ? 'Yes' : 'No'}</dd>

        <dt>Exact blocker</dt>
        <dd>{record.finalBlocker ?? '—'}</dd>

        <dt>Display action</dt>
        <dd>{record.displayAction}</dd>

        <dt>Provenance</dt>
        <dd>{record.sourceLabel}</dd>
      </dl>
    </div>
  );
}
