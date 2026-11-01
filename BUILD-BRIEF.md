# MeterBuy — Telegraph S2 Build Brief (executor → grok_task)

**DO NOT Submit to hackathon portal. DO NOT re-register Soft Join.**

## Goal
Ship a high-quality Apps & Agents demo for Mission 09 Personal Agent: **MeterBuy** — Adept/MultiOn/Browserbase-style “agent pays for tools” remade on Telegraph Intents × Providers × Evaluators. Operator pays per ranked supply; no miner stack.

## Hard contest requirement
At least one **real M2M** intelligence purchase via Telegraph **testnet**, then use returned intel for one measurable task. Show receipt, spend, Provider evidence, result. Reproducible sandbox: user changes inputs → truly recomputes.

## Stack facts (verified live 2026-11-02)
- Engine: `https://devnode.telegraphprotocol.com/engine`
- `POST /engine/v1/ask` returns 402; pay with `@x402/fetch` + `@x402/evm` ExactEvmScheme on Sepolia (`eip155:11155111`)
- USDC: `0xcc194e1a843B658526D0D5C431f670028582Ae17` (mintable test token)
- Intents useful for Mission 09: CRYPTO_PRICE_USD / CRYPTO_PRICE, WEB_SEARCH_GENERAL, WEATHER_*, AI_TEXT_DETECTION_GENERAL, QUESTION_ANSWERING*
- Receipt: header `X-TELEGRAPH-RECEIPT` + body `signal_hash` → `GET /engine/v1/signal/{hash}`
- Docs: https://docs.telegraphprotocol.com/docs/using/engine-ask · x402-inference · mcp-server
- Burner env (server-only): `/workspace/competitions/telegraph-s2/meterbuy/.env.burner.local` — if wallet lacks Sepolia ETH/USDC, ship honest **Mock mode** with identical UI + real SDK hooks; never fake receipts as live.

## Product UX (EN only)
1. Landing: premium, not AI-slop; use design-taste-frontend if practical (`/home/box/sand-data/workflows/design-taste-frontend`)
2. Demo sandbox:
   - Pick task presets: (A) Personal crypto briefing — buy CRYPTO_PRICE_USD for symbols user enters → produce ranked briefing with spend/receipt; (B) Fraud/AI-text check — buy AI_TEXT_DETECTION on pasted text → verdict + confidence used in a “send / hold” decision; (C) Web intel brief — WEB_SEARCH_GENERAL query → actionable note
   - Budget / max spend control
   - Live vs Mock toggle (auto-fallback to Mock if payment fails; label clearly)
   - After run: Intent, miner id/name, cost_usd, duration_ms, signal_hash, receipt decode, task result that **depends on** the intel (not decorative)
3. Every re-run with new inputs must hit Engine again (or mock regen) — no cached fake win

## Deliverables in this directory
1. Working Next.js (App Router) + TypeScript app, English UI
2. `lib/telegraph/` client: discover intents/miners, ask with x402, parse receipt/signal
3. API routes that keep private key server-side
4. README.md (EN) + `docs/` contest context, how to run, how to fund burner, reproducibility
5. BUILD-STATUS.md — URLs, what works, gaps, **explicit no Submit**
6. `docs/EXPLAINER-SCRIPT.md` ≤5min product-only (effect not engineering); Remotion stub optional if time
7. Public GitHub under **er-s-an** if `gh` works; Vercel deploy if possible
8. Update parent Soft Join note to Build in progress / GO — still no Submit

## Quality bar
- Frontend first: visual/interaction excellence
- Honest about testnet vs mock
- Reject: fake receipts labeled live / no Telegraph path / generic GPT shell / 祖传换皮

## Rejected / out of scope this pass
Portal Submit, Soft re-register, chat mp4 (videos only via review-clips later)
