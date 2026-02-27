'use client';

import { useMemo, useState } from 'react';
import MMTClock from '../components/MMTClock';
import KillzoneRadar from '../components/KillzoneRadar';
import TopTicker from '../components/TopTicker';
import TradingViewPanel from '../components/TradingViewPanel';
import ToolsGrid from '../components/ToolsGrid';
import SixLineSetupCard from '../components/SixLineSetupCard';
import BacktestModal from '../components/BacktestModal';
import ExecutionModal from '../components/ExecutionModal';
import BeginnerEducationPanel from '../components/BeginnerEducationPanel';
import JournalPanel from '../components/JournalPanel';

const RULES = {
  riskMin: 0.35,
  riskMax: 0.75,
  rrMin: 2,
  maxTradesPerSession: 2,
};

const DEFAULT_SETUP = {
  pair: 'SOLUSDT',
  direction: 'LONG',
  entry: 172.44,
  stop: 171.62,
  tp1: 174.08,
  tp2: 175.32,
  rr: 2.1,
  grade: 'A+',
  session: 'NYKZ',
  setupType: 'Range Reclaim + Mean Revert',
};

export default function Page() {
  const [showBacktest, setShowBacktest] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);
  const [lastExecMessage, setLastExecMessage] = useState('Simulation mode armed.');

  const riskPct = 0.55;
  const canTrade =
    DEFAULT_SETUP.grade !== 'B' &&
    riskPct >= RULES.riskMin &&
    riskPct <= RULES.riskMax &&
    DEFAULT_SETUP.rr >= RULES.rrMin &&
    tradeCount < RULES.maxTradesPerSession;

  const riskGateText = useMemo(() => {
    if (tradeCount >= RULES.maxTradesPerSession) return 'Trade cap reached (2/session).';
    if (DEFAULT_SETUP.grade !== 'A+' && DEFAULT_SETUP.grade !== 'A') return 'Only A+/A setups allowed.';
    if (DEFAULT_SETUP.rr < RULES.rrMin) return 'RR below 1:2 minimum.';
    return 'All institutional gates passed.';
  }, [tradeCount]);

  return (
    <main className="terminal-root">
      <header className="top-nav glass-card">
        <div className="brand-block">
          <h1>QuentrexClaw v5.1</h1>
          <p>Institutional ICT/SMC Killzone Scalping Terminal · Peps Trading</p>
        </div>

        <TopTicker />

        <div className="auth-block">
          <div className="user-chip">Auth placeholder active (set Clerk keys to enable login)</div>
        </div>
      </header>

      <section className="status-strip glass-card">
        <MMTClock />
        <KillzoneRadar />
        <div className="gate-box">
          <span className="chip">Pair Universe: SOL primary · BTC/ETH backup</span>
          <span className="chip">Risk: {RULES.riskMin}%–{RULES.riskMax}%</span>
          <span className="chip">Min RR: 1:{RULES.rrMin}</span>
          <span className="chip">Trades this session: {tradeCount}/{RULES.maxTradesPerSession}</span>
        </div>
      </section>

      <section className="terminal-grid">
        <aside className="left-col glass-card">
          <h3>Command Center</h3>
          <button className="btn-primary full" onClick={() => setShowBacktest(true)}>
            Backtest this setup (OpenAlgo + VectorBT style)
          </button>
          <button className="btn-ghost full" onClick={() => setShowExecution(true)} disabled={!canTrade}>
            CONFIRM + EXECUTE REAL
          </button>
          <div className="risk-gate">
            <strong>Risk Gate</strong>
            <p>{riskGateText}</p>
          </div>

          <div className="stack-list">
            <h4>Always-On Protocol</h4>
            <ul>
              <li>Killzone-only trading (MMT enforced)</li>
              <li>Range / Mean-Revert only</li>
              <li>No B/C setups</li>
              <li>Simulate first, then explicit confirm</li>
              <li>News gate + SMT divergence required</li>
            </ul>
          </div>

          <div className="exec-feed">
            <h4>Execution Feed</h4>
            <p>{lastExecMessage}</p>
          </div>
        </aside>

        <section className="main-col">
          <SixLineSetupCard setup={DEFAULT_SETUP} />
          <TradingViewPanel />
          <ToolsGrid />
        </section>

        <aside className="right-col">
          <BeginnerEducationPanel />
          <JournalPanel />
        </aside>
      </section>

      {showBacktest && <BacktestModal onClose={() => setShowBacktest(false)} />}

      {showExecution && (
        <ExecutionModal
          onClose={() => setShowExecution(false)}
          onExecuted={(message) => {
            setTradeCount((c) => c + 1);
            setLastExecMessage(message);
            setShowExecution(false);
          }}
        />
      )}
    </main>
  );
}
