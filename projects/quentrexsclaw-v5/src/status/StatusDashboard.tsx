/**
 * Quantrex Status Dashboard v0.1 — read-only visibility surface.
 *
 * NOT a trading terminal. NOT a signal generator. NOT an execution surface.
 *
 * One rule dominates the UI: FINAL HARD GATE WINS. The final operational state
 * is always shown as more authoritative than the preliminary scanner state; a
 * scanner GO that the final hard gate downgrades is marked DOWNGRADED and
 * never yields executable content.
 *
 * v0.1 renders DEMO / FIXTURE ONLY. There is no live fetch and no live clock;
 * timestamps are static fixture values shown for provenance only.
 */
import { useMemo, useState } from 'react';
import { FIXTURE } from './fixture';
import type { OperationalState, StatusRecord } from './types';
import './StatusDashboard.css';

const DETAIL_PANEL_ID = 'qsdb-candidate-detail';

const FINAL_STATE_LABEL: Record<OperationalState, string> = {
  ENTRY_GO: 'ENTRY_GO',
  POSITION_MANAGE_ONLY: 'POSITION_MANAGE_ONLY',
  MONITOR_ONLY: 'MONITOR_ONLY',
};

/** True when a preliminary scanner GO was overridden by the final hard gate. */
function isDowngraded(record: StatusRecord): boolean {
  return record.scannerState === 'GO' && record.finalOperationalState !== 'ENTRY_GO';
}

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

export default function StatusDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const primary = useMemo(
    () => FIXTURE.records.find((r) => r.id === FIXTURE.primaryId) ?? FIXTURE.records[0],
    []
  );
  const selected = useMemo(
    () => FIXTURE.records.find((r) => r.id === selectedId) ?? null,
    [selectedId]
  );

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
          <span className="qsdb-clock-pill" aria-label="Demo snapshot, not a live clock">
            DEMO SNAPSHOT — NOT A LIVE CLOCK
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
              <th scope="col">Generated</th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE.records.map((record) => {
              const downgraded = isDowngraded(record);
              const isSelected = selectedId === record.id;
              const classNames = [
                'qsdb-row',
                downgraded ? 'qsdb-row-downgraded' : '',
                isSelected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <tr key={record.id} className={classNames}>
                  <th scope="row" data-label="Instrument">
                    <button
                      type="button"
                      className="qsdb-instrument-trigger"
                      aria-label={`Details for ${record.instrument}`}
                      aria-expanded={isSelected}
                      aria-controls={DETAIL_PANEL_ID}
                      onClick={() => setSelectedId(record.id)}
                    >
                      <span>{record.instrument}</span>
                      <span aria-hidden="true" className="qsdb-chevron">›</span>
                    </button>
                  </th>
                  <td data-label="Venue / Contract">
                    <div className="qsdb-venue">{record.venue}</div>
                    <div className="qsdb-contract">{record.contract}</div>
                  </td>
                  <td data-label="Scanner State">
                    <span className="qsdb-scanner">{record.scannerState}</span>
                  </td>
                  <td data-label="Final State">
                    <span
                      className={`qsdb-state-badge qsdb-state-${record.finalOperationalState} qsdb-final`}
                    >
                      {FINAL_STATE_LABEL[record.finalOperationalState]}
                    </span>
                    {downgraded && (
                      <span
                        className="qsdb-downgrade-tag"
                        aria-label="Downgraded by final hard gate"
                      >
                        DOWNGRADED
                      </span>
                    )}
                  </td>
                  <td data-label="Runnable">
                    <span className={`qsdb-runnable ${record.runnableNow ? 'is-yes' : 'is-no'}`}>
                      {record.runnableNow ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td data-label="Final Blocker">
                    <span className="qsdb-blocker">{record.finalBlocker ?? '—'}</span>
                  </td>
                  <td data-label="Generated">
                    <span className="qsdb-gen">{formatUtc(record.generatedAt)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── 4. DETAIL PANEL (read-only provenance) ── */}
      <section
        id={DETAIL_PANEL_ID}
        className="qsdb-detail"
        aria-label="Candidate detail"
        aria-live="polite"
      >
        {selected ? (
          <DetailPanel record={selected} />
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
}

function DetailPanel({ record }: DetailPanelProps) {
  const downgraded = isDowngraded(record);

  return (
    <div className="qsdb-detail-body">
      <div className="qsdb-detail-head">
        <h2 className="qsdb-detail-title">
          {record.instrument} · {record.contract}
        </h2>
        <span className="qsdb-clock-pill-small">DEMO — NOT A LIVE CLOCK</span>
      </div>

      <p className="qsdb-detail-rule">Final hard gate wins.</p>

      <dl className="qsdb-detail-grid">
        <dt>Source timestamp</dt>
        <dd>{formatUtc(record.generatedAt)}</dd>

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
