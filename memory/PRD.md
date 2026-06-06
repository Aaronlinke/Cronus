# Omnigenesis Master Dashboard — PRD

## Problem Statement
Build a professional, dark-themed 'Omnigenesis Master Dashboard' (HTML5/React) with:
1. Sultan-Inversion Terminal — real-time log output (simulated SCC + Delta-Heuristic)
2. Blockchain Balance Checker — BTC address input, balance via Blockstream API
3. Chrono-Field Visualizer — 3D animated canvas (Three.js) for Phi/Gamma resonance
4. Inversion Result Panel — Collapsed WIF Key output + COPY button
5. Logic-Kernel Controls — sliders for Causality Entropy, 45° Twist, PEC-Gamma
Style: high-tech, professional, no filler.

## Nature
**Theoretical simulation.** Per the user's later analytical artifacts, the underlying
"Sultan-Inversion / Chrono-Metafield" concepts (preimage-inversion of SHA256/RIPEMD160,
polynomial-time ECDLP) are mathematically/cryptographically impossible. The dashboard
is therefore an artistic/operational console for visualising those theoretical concepts,
and clearly carries a `▲ theoretical · sim` badge in the header.

## Architecture
- **Backend** (`/app/backend/server.py`, FastAPI):
  - `GET  /api/` → service heartbeat
  - `POST /api/inversion/run` → synthetic WIF + 14-step trace
    (tags: SCC, BCH, TWS, DLT, PHI, GAM, TIC, AFR, TQES, ECDLP, WIF, OK)
    accepts optional `target_address`
  - `GET  /api/inversion/stream` → SSE log feed (13 theory-tag flavours)
- **Frontend** (`/app/frontend/src`, React + Tailwind + vanilla Three.js):
  - `pages/OmnigenesisDashboard.jsx` — 12-col grid, shared `kernel` + `target` state
  - `components/dashboard/DashboardHeader.jsx` — sim badge, target chip, clock
  - `components/dashboard/SultanTerminal.jsx` — EventSource stream + LOCK injection
  - `components/dashboard/ChronoField.jsx` — vanilla three.js (R3F removed due to
    emergent visual-edits plugin conflict). Formula overlay shows
    `[X_L,X_R]=iT_vac·ℏ`, `e^(−iσ_z/2)`, `y²=x³+7 (mod p)`
  - `components/dashboard/InversionResult.jsx` — POST with target, COPY w/ fallback
  - `components/dashboard/KernelControls.jsx` — 3 sharp-edged sliders
  - `components/dashboard/BalanceChecker.jsx` — Blockstream call + LOCK button
- **Design**: Archetype 7 — Tactical Terminal. Palette: `#030303` / `#FFB000` / `#00E5FF`.
  Fonts: Unbounded (headings) + JetBrains Mono (body/terminal).

## Implemented
- [2026-02] MVP: all 5 panels, SSE streaming, WIF inversion, BTC balance, 3D resonance
- [2026-02] Theory polish: SIMULATION badge, real equation overlays, address→target lock,
  13 theory-aligned log tags, BCH/TIC/AFR/TQES/ECDLP steps, clipboard fallback
- [2026-06] Iteration 2 polish:
  - In-browser hash160 derivation (base58check + bech32 / bech32m) — `lib/btc.js`
  - MongoDB persistence of inversions + `GET/DELETE /api/inversion/history` + `created_at` index
  - Mobile responsive layout (panels stack, body scrollable < md)
  - Terminal Pause/Resume + Clear (closes/reopens EventSource)
  - JSON export of full inversion trace
  - Header TARGET chip; LOCK lines (address + hash160) injected into terminal

## Personas
- Operator / observer of the Omnigenesis theoretical framework
- Demo / showcase audience for the visual aesthetic

## Backlog
- P1: Backend SSE per-client target streaming (currently a single global feed)
- P1: Persist inversion history in MongoDB (motor already wired, unused)
- P2: Hash160 derivation in-browser via crypto-js (base58 decode + SHA256+RIPEMD160)
  so the LOCK button populates a real hash160 visualisation
- P2: Pause / resume terminal stream control
- P2: Export inversion trace as JSON
- P3: Mobile responsive layout below md breakpoint

## Test Credentials
n/a — no auth in this app.
