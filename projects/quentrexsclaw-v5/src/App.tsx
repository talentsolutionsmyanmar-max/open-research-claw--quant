/**
 * Quantrex Status Dashboard v0.1 — application root.
 *
 * The served surface is the read-only Status Dashboard. The legacy trading
 * terminal that previously lived here is removed from the render path (it
 * remains recoverable via git history). This app does not execute trades,
 * does not fetch live data in this slice, and renders DEMO / FIXTURE ONLY.
 */
import StatusDashboard from './status/StatusDashboard';

export default function App() {
  return <StatusDashboard />;
}
