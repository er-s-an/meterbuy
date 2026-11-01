reasoning effort: xhigh / Extra High

Build MeterBuy end-to-end in this cwd for Telegraph Hackathon Season II.
Soft Join ALREADY REGISTERED — DO NOT Submit portal, DO NOT re-register.

## Mandatory reading
- BUILD-BRIEF.md (this directory)
- ../research/TELEGRAPH-STACK-2026-11-02.md
- /workspace/competitions/_gates/2026-10-30-cooper-am-forge-gate.md
- Official: https://docs.telegraphprotocol.com/docs/using/engine-ask and x402-inference
- Optional landing polish skill: /home/box/sand-data/workflows/design-taste-frontend

## Product
MeterBuy = Adept/MultiOn/Browserbase-style “agent pays for tools” on Telegraph Intents × Providers × Evaluators.
Users: personal/small-team operators; pay-per-ranked-supply for fraud-check / search / DeFi / briefing intel without miner stack.
Mission 09 Personal Agent. Hard requirement: real testnet M2M buy → meaningful task; show receipt/spend/provider/result; reproducible sandbox.

## Ship (all)
1. Next.js App Router + TS, English-only UI. Frontend first, stunning. Sandbox recomputes on new inputs.
   Presets: (A) CRYPTO_PRICE_USD briefing from user symbols; (B) AI_TEXT_DETECTION gate SEND/HOLD; (C) WEB_SEARCH_GENERAL intel note.
   Live vs Mock (honest labels). Budget cap. Results: intent, miner, cost, duration, signal_hash, receipt, task outcome depending on intel.
2. lib/telegraph + server API routes; private key only server-side from .env.local / .env.burner.local (exists; may be unfunded — graceful Mock fallback; never fake live receipts).
3. scripts/smoke-ask.mjs + docs/evidence/
4. README.md EN, docs/CONTEST.md, docs/EXPLAINER-SCRIPT.md (≤5min product), BUILD-STATUS.md
5. npm run build must pass. Push public GitHub under er-s-an if possible. Vercel deploy if possible.
6. Update Soft Join note only as Build in progress — still no Submit.

## Return
paths, demo URL, GitHub URL, M2M proof status, explainer status, gaps, confirm no Submit.
