#!/usr/bin/env node
/**
 * Quantrex Status Dashboard v0.1 — mobile browser-geometry regression gate.
 *
 * REAL DOM measurement (not CSS-string inspection): serves the existing
 * `build/`, drives the locally installed Chrome via the DevTools Protocol at a
 * 390px viewport, and asserts the whole mobile page fits with no horizontal
 * overflow and no target surface clipped.
 *
 * Prereq: run `npm run build` first. Override Chrome path with CHROME_PATH.
 * Pass = exit 0, fail = exit 1. Prints a JSON report on stdout.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, '..', 'build');
const PORT = Number(process.env.PORT) || 4179;
const DEBUG_PORT = Number(process.env.DEBUG_PORT) || 9223;
const WIDTH = 390;
const HEIGHT = 1000;
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.map': 'application/json', '.txt': 'text/plain',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server;
let chromeProc;

function teardown(code) {
  try { if (chromeProc && !chromeProc.killed) chromeProc.kill('SIGKILL'); } catch { /* */ }
  try { if (server) server.close(); } catch { /* */ }
  // Let stdout flush before forcing exit.
  setTimeout(() => process.exit(code), 80);
}

if (!fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
  console.error(`No build at ${BUILD_DIR}. Run "npm run build" first.`);
  teardown(1);
  await new Promise(() => {});
}

// 1) Static server for the production build.
server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const fp = path.join(BUILD_DIR, urlPath);
  if (!fp.startsWith(BUILD_DIR) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
    res.setHeader('Content-Type', 'text/html');
    res.end(fs.readFileSync(path.join(BUILD_DIR, 'index.html')));
    return;
  }
  res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
  res.end(fs.readFileSync(fp));
});
await new Promise((r) => server.listen(PORT, r));

// 2) Launch Chrome (window pinned to 390; CDP also sets the layout viewport).
chromeProc = spawn(
  CHROME,
  [
    '--headless', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${WIDTH},${HEIGHT}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=/tmp/qsdb-geom',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

// 3) Discover the page target.
let target = null;
for (let i = 0; i < 60; i += 1) {
  try {
    const list = await (await fetch(`http://localhost:${DEBUG_PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page') || list[0];
    if (target && target.webSocketDebuggerUrl) break;
  } catch { /* not ready */ }
  await sleep(250);
}
if (!target) {
  console.error(JSON.stringify({ error: 'no Chrome page target' }));
  teardown(1);
  await new Promise(() => {});
}

// 4) CDP over WebSocket (Node global WebSocket = browser/WHATWG API).
const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (msgId += 1);
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
ws.addEventListener('message', (event) => {
  const raw = typeof event.data === 'string' ? event.data : event.data.toString();
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', () => resolve(), { once: true });
  ws.addEventListener('error', () => reject(new Error('ws error')));
  setTimeout(() => reject(new Error('ws open timeout')), 10000);
});

await send('Page.enable');
await send('Runtime.enable');
// setDeviceMetricsOverride forces a true mobile layout viewport. Set NO_OVERRIDE=1
// to measure the raw --window-size (desktop) condition used by the screenshot tool.
if (!process.env.NO_OVERRIDE) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: true,
  });
}
await send('Page.navigate', { url: `http://localhost:${PORT}/` });

for (let i = 0; i < 60; i += 1) {
  const { result } = await send('Runtime.evaluate', { expression: 'document.readyState' });
  if (result.value === 'complete') break;
  await sleep(250);
}
await sleep(1200);

// 5) Measure.
const expr = `(() => {
  const vw = window.innerWidth;
  const sw = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const cw = document.documentElement.clientWidth;
  const selectors = {
    topbar: '.qsdb-topbar', demoBadge: '.qsdb-demo-badge', clockPill: '.qsdb-clock-pill',
    disclaimer: '.qsdb-not-live-note', hero: '.qsdb-hero', downgradeBanner: '.qsdb-downgrade-banner',
    firstCard: '.qsdb-table tbody tr:first-child', finalBlockerValue: '.qsdb-table tbody tr .qsdb-blocker',
    stateBadges: '.qsdb-state-badge', detailPanel: '.qsdb-detail', footer: '.qsdb-footer'
  };
  const targets = {};
  for (const [name, sel] of Object.entries(selectors)) {
    targets[name] = [...document.querySelectorAll(sel)].map((e) => {
      const r = e.getBoundingClientRect();
      return { right: Math.round(r.right*10)/10, width: Math.round(r.width*10)/10,
        text: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,48) };
    });
  }
  let worst = null;
  for (const e of document.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (!worst || r.right > worst.right) {
      worst = { tag: e.tagName, id: e.id||'',
        cls: (e.className && e.className.toString) ? e.className.toString().slice(0,70) : '',
        right: Math.round(r.right*10)/10, text: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,60) };
    }
  }
  const rendered = {
    strategy: (document.querySelector('.qsdb-strategy')||{}).textContent || null,
    cardCount: document.querySelectorAll('.qsdb-table tbody tr').length,
    demoBadgeText: (document.querySelector('.qsdb-demo-badge')||{}).textContent || null
  };
  return { viewportWidth: vw, scrollWidth: sw, clientWidth: cw, rendered, targets, worst };
})()`;

const { result } = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
const data = result.value;

const vw = data.viewportWidth;
const sw = data.scrollWidth;
const allRects = Object.entries(data.targets).flatMap(([name, arr]) => arr.map((t) => ({ name, ...t })));
const maxTargetRight = allRects.reduce((m, t) => Math.max(m, t.right || 0), 0);
const offenders = allRects.filter((t) => t.right > vw + 0.5);
const renderedOk = data.rendered.cardCount > 0 && !!data.rendered.demoBadgeText;
const pass = renderedOk && sw <= vw + 0.5 && offenders.length === 0;

const report = {
  pass, viewportWidth: vw, scrollWidth: sw, clientWidth: data.clientWidth,
  maxTargetRight, rendered: data.rendered, worstElement: data.worst, offenders,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

// Optional: capture a screenshot at the SAME viewport the geometry was measured
// at (CDP setDeviceMetricsOverride), so the image cannot diverge from the layout.
if (process.env.SHOT_OUT) {
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  fs.writeFileSync(process.env.SHOT_OUT, Buffer.from(shot.data, 'base64'));
  process.stdout.write(`screenshot: ${process.env.SHOT_OUT}\n`);
}

await sleep(60);
teardown(pass ? 0 : 1);
await new Promise(() => {});
