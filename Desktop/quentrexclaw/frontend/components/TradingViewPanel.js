'use client';

export default function TradingViewPanel() {
  return (
    <section className="glass-card tv-panel">
      <div className="panel-head">
        <h3>TradingView 15m · VWAP + Volume Profile Context</h3>
        <span className="chip">SOLUSDT · Mean-Revert View</span>
      </div>
      <iframe
        className="chart-shell"
        title="TradingView SOLUSDT"
        src="https://s.tradingview.com/widgetembed/?frameElementId=tv-frame&symbol=BINANCE%3ASOLUSDT&interval=15&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=0f141c&theme=dark&style=1&timezone=Asia%2FYangon&studies=%5B%22VWAP%40tv-basicstudies%22%2C%22Volume%40tv-basicstudies%22%5D"
      />
    </section>
  );
}
