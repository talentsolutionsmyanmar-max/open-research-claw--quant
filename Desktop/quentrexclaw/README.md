## QuentrexClaw v5.1 — Next.js 15 Clerk Terminal (Frontend)

This repository now includes a ready-to-deploy Next.js App Router terminal in [`frontend/app/page.js`](frontend/app/page.js) with:

- Clerk auth layout in [`frontend/app/layout.js`](frontend/app/layout.js)
- Cyber glassmorphism style in [`frontend/app/globals.css`](frontend/app/globals.css)
- Modular dashboard components in [`frontend/components/`](frontend/components/)

---

## 1) Create/prepare Clerk app

1. Create a Clerk app at [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. In Clerk dashboard, copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Set allowed redirect URLs to your local and production domains:
   - `http://localhost:3000`
   - `https://<your-vercel-domain>.vercel.app`

---

## 2) Install dependencies in `frontend`

```bash
cd frontend
npm install next@latest react@latest react-dom@latest @clerk/nextjs
```

If needed, initialize a Next app config in `frontend`:

```bash
npx next telemetry disable
```

---

## 3) Local environment

Create [`frontend/.env.local`](frontend/.env.local):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

Run locally:

```bash
cd frontend
npm run dev
```

---

## 4) Vercel deployment steps

1. Push code to GitHub/GitLab/Bitbucket.
2. In Vercel, import the repo.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Next.js**.
5. Add env vars in Vercel Project Settings:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
6. Deploy.
7. Add the production domain in Clerk allowed origins/redirects.

Optional CLI deploy from repo root:

```bash
vercel --cwd frontend --prod
```

---

## 5) Included terminal files

- [`frontend/app/layout.js`](frontend/app/layout.js)
- [`frontend/app/page.js`](frontend/app/page.js)
- [`frontend/app/globals.css`](frontend/app/globals.css)
- [`frontend/components/MMTClock.js`](frontend/components/MMTClock.js)
- [`frontend/components/KillzoneRadar.js`](frontend/components/KillzoneRadar.js)
- [`frontend/components/TopTicker.js`](frontend/components/TopTicker.js)
- [`frontend/components/SixLineSetupCard.js`](frontend/components/SixLineSetupCard.js)
- [`frontend/components/TradingViewPanel.js`](frontend/components/TradingViewPanel.js)
- [`frontend/components/ToolsGrid.js`](frontend/components/ToolsGrid.js)
- [`frontend/components/BacktestModal.js`](frontend/components/BacktestModal.js)
- [`frontend/components/ExecutionModal.js`](frontend/components/ExecutionModal.js)
- [`frontend/components/BeginnerEducationPanel.js`](frontend/components/BeginnerEducationPanel.js)
- [`frontend/components/JournalPanel.js`](frontend/components/JournalPanel.js)

---

## 6) Notes for production hardening

- Replace simulated data feeds with real server/API routes.
- Add real persistence for journal (Supabase or SQLite API route).
- Add authenticated protected route wrappers/middleware for journal and execution logs.
- Integrate CCXT/OpenAlgo/VectorBT services via backend workers.

