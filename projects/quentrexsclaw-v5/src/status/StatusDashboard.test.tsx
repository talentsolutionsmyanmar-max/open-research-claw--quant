/**
 * Quantrex Status Dashboard v0.1 — behaviour tests (TDD).
 *
 * These tests pin the read-only, hard-gate-wins contract of the dashboard:
 * the DEMO label is visible, the final state is rendered and dominates the
 * scanner state, downgrades are marked, runnable state is shown, the fixture
 * carries no forbidden execution fields, the rendered UI shows no plan
 * labels, and the detail panel is a read-only provenance view.
 */
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusDashboard from './StatusDashboard';
import { FIXTURE } from './fixture';
import { findForbiddenKeys } from './guard';

const XAU_TS = new Date('2026-08-13T08:15:36Z').getTime();

describe('Quantrex Status Dashboard v0.1', () => {
  it('is visibly labeled DEMO SNAPSHOT — NOT LIVE', () => {
    render(<StatusDashboard />);
    expect(screen.getByText(/DEMO SNAPSHOT — NOT LIVE/i)).toBeInTheDocument();
  });

  it('renders the final operational state in the final-decision hero', () => {
    render(<StatusDashboard />);
    const hero = screen.getByRole('region', { name: /final decision/i });
    expect(within(hero).getByText('MONITOR_ONLY')).toBeInTheDocument();
  });

  it('shows runnable state as false for the primary fixture', () => {
    render(<StatusDashboard />);
    const hero = screen.getByRole('region', { name: /final decision/i });
    expect(within(hero).getByText(/Runnable:\s*false/i)).toBeInTheDocument();
  });

  it('marks a scanner GO downgraded to MONITOR_ONLY as DOWNGRADED', () => {
    render(<StatusDashboard />);
    const row = screen.getByRole('row', { name: /XAUUSDT/i });
    expect(within(row).getByText(/DOWNGRADED/i)).toBeInTheDocument();
  });

  it('does not render execution plan labels or controls', () => {
    const { container } = render(<StatusDashboard />);
    expect(container.textContent).not.toMatch(
      /stop\s*loss|take\s*profit|\bTP\d?\b|\bSL\b|\btarget\b|leverage|position\s*size|\bquantity\b|R\s*[:/]\s*R|risk[-_/ ]?reward|\bBUY\b|\bSELL\b|reduce[_ ]?only|client[_ ]?order/i
    );
  });

  it('contains no forbidden execution field names in the fixture data', () => {
    expect(findForbiddenKeys(FIXTURE)).toEqual([]);
  });

  it('opens a read-only detail panel showing "Final hard gate wins" and the exact blocker', () => {
    render(<StatusDashboard now={XAU_TS + 60 * 1000} />);
    fireEvent.click(screen.getByRole('button', { name: /details for XAUUSDT/i }));
    const panel = screen.getByRole('region', { name: /candidate detail/i });
    expect(within(panel).getByText(/Final hard gate wins/i)).toBeInTheDocument();
    expect(
      within(panel).getByText(/Hyperliquid confirmation unavailable/i)
    ).toBeInTheDocument();
  });

  it('reports a stale indicator when age exceeds the threshold', () => {
    render(<StatusDashboard now={XAU_TS + 30 * 60 * 1000} />);
    expect(screen.getAllByText(/\bSTALE\b/i).length).toBeGreaterThan(0);
  });

  it('reports fresh status when age is within the threshold', () => {
    render(<StatusDashboard now={XAU_TS + 60 * 1000} />);
    expect(screen.queryAllByText(/\bSTALE\b/i)).toHaveLength(0);
    expect(screen.getAllByText(/\bFRESH\b/i).length).toBeGreaterThan(0);
  });
});
