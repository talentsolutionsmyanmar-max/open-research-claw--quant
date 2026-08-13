/**
 * Quantrex Status Dashboard v0.1 — behaviour tests (TDD, revised).
 *
 * Pins the read-only, final-hard-gate-wins contract:
 * no live clock; no bot-approved/prior-plan copy; all three operational states
 * covered; MONITOR_ONLY never runnable; POSITION_MANAGE_ONLY never offers
 * new/re-entry/add/averaging/reversal/imperative copy; downgrades carry no
 * executable content; the MONITOR_ONLY_OUTCOME concept is absent; detail
 * triggers expose aria-expanded/aria-controls and drive a read-only panel.
 */
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusDashboard from './StatusDashboard';
import { FIXTURE } from './fixture';
import { findUnsafeRenderCopy } from './guard';

describe('Quantrex Status Dashboard v0.1 (revised)', () => {
  it('is labeled DEMO SNAPSHOT — NOT A LIVE CLOCK', () => {
    render(<StatusDashboard />);
    expect(screen.getByText(/NOT A LIVE CLOCK/i)).toBeInTheDocument();
  });

  it('keeps not-live / not-trade wording', () => {
    render(<StatusDashboard />);
    expect(screen.getByText(/DEMO SNAPSHOT — NOT LIVE/i)).toBeInTheDocument();
    // "not a trade instruction" appears in both the not-live note and the footer.
    expect(screen.getAllByText(/not a trade instruction/i).length).toBeGreaterThan(0);
  });

  it('does not present a live FRESH/STALE clock or computed age', () => {
    const { container } = render(<StatusDashboard />);
    expect(container.textContent).not.toMatch(/\bFRESH\b/);
    expect(container.textContent).not.toMatch(/\bSTALE\b/);
    expect(container.textContent).not.toMatch(/\d+\s*(s|m|h|d)\s*old/i);
  });

  it('covers all three operational states in the fixture', () => {
    const states = FIXTURE.records.map((r) => r.finalOperationalState);
    expect(states).toEqual(
      expect.arrayContaining(['ENTRY_GO', 'POSITION_MANAGE_ONLY', 'MONITOR_ONLY'])
    );
  });

  it('enforces MONITOR_ONLY => runnableNow false across the fixture', () => {
    for (const r of FIXTURE.records) {
      if (r.finalOperationalState === 'MONITOR_ONLY') {
        expect(r.runnableNow).toBe(false);
      }
    }
  });

  it('POSITION_MANAGE_ONLY copy never offers new/re-entry/add/averaging/reversal', () => {
    const managed = FIXTURE.records.filter(
      (x) => x.finalOperationalState === 'POSITION_MANAGE_ONLY'
    );
    expect(managed.length).toBeGreaterThan(0);
    for (const r of managed) {
      const copy = `${r.displayAction} ${r.finalBlocker ?? ''}`;
      expect(copy).not.toMatch(
        /new[- ]?entry|re[- ]?entry|\badd\b|averaging|average (down|up)|\breverse|reversal|imperative|execute/i
      );
    }
  });

  it('contains no bot-approved or prior-plan copy', () => {
    const { container } = render(<StatusDashboard />);
    expect(container.textContent).not.toMatch(/bot-approved|prior plan|active plan/i);
  });

  it('does not reference the MONITOR_ONLY_OUTCOME concept', () => {
    const { container } = render(<StatusDashboard />);
    expect(container.textContent).not.toMatch(/MONITOR_ONLY_OUTCOME/);
    expect(JSON.stringify(FIXTURE)).not.toMatch(/MONITOR_ONLY_OUTCOME/);
  });

  it('marks a scanner GO downgraded to MONITOR_ONLY as DOWNGRADED', () => {
    render(<StatusDashboard />);
    const row = screen.getByRole('row', { name: /XAUUSDT/i });
    expect(within(row).getByText(/DOWNGRADED/i)).toBeInTheDocument();
  });

  it('a scanner GO + final MONITOR_ONLY row has no executable content', () => {
    render(<StatusDashboard />);
    const row = screen.getByRole('row', { name: /XAUUSDT/i });
    expect(
      within(row).queryByRole('button', { name: /execute|buy|sell|place order/i })
    ).toBeNull();
    expect(row.textContent).not.toMatch(
      /entry price|stop loss|take profit|leverage|position size|R\s*[:/]\s*R/i
    );
  });

  it('has no execution plan labels or controls anywhere in the render', () => {
    const { container } = render(<StatusDashboard />);
    expect(findUnsafeRenderCopy(container.textContent || '')).toEqual([]);
  });

  it('instrument triggers expose aria-expanded and aria-controls and drive the detail panel', () => {
    render(<StatusDashboard />);
    const trigger = screen.getByRole('button', { name: /details for XAUUSDT/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panelId = trigger.getAttribute('aria-controls');
    const panel = screen.getByRole('region', { name: /candidate detail/i });
    expect(panel.id).toBe(panelId);
    expect(within(panel).getByText(/Final hard gate wins/i)).toBeInTheDocument();
    expect(
      within(panel).getByText(/Hyperliquid confirmation unavailable/i)
    ).toBeInTheDocument();
  });

  it('default hero shows MONITOR_ONLY / Runnable: false', () => {
    render(<StatusDashboard />);
    const hero = screen.getByRole('region', { name: /final decision/i });
    expect(within(hero).getByText('MONITOR_ONLY')).toBeInTheDocument();
    expect(within(hero).getByText(/Runnable:\s*false/i)).toBeInTheDocument();
  });

  it('detail panel shows a static (non-clock) provenance timestamp', () => {
    render(<StatusDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /details for XAUUSDT/i }));
    const panel = screen.getByRole('region', { name: /candidate detail/i });
    expect(within(panel).getByText(/2026-08-13 08:15:36 UTC/i)).toBeInTheDocument();
  });
});
