import './globals.css';

export const metadata = {
  title: 'QuentrexClaw v5.1 — Peps Trading Terminal',
  description:
    'Institutional-grade ICT/SMC killzone scalping terminal with strict risk gates, natural-language backtesting, and authenticated journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
