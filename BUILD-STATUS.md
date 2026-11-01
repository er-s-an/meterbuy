# MeterBuy build status

Times are Asia/Shanghai unless noted.

- 2026-11-02: Build in progress. Soft Join remains registered. **No portal Submit has been performed. Do not Submit until the user says 交. Do not re-register.**
- GitHub: https://github.com/er-s-an/meterbuy (public, account er-s-an)
- Live demo URL: not on Vercel. No `VERCEL_TOKEN` in this environment, so deploy was not attempted. Local production check: http://127.0.0.1:3456
- M2M proof: `blocked-unfunded`. `npm run smoke` and the desk both receive a real HTTP 402 exact-scheme challenge on Sepolia (`eip155:11155111`, 10000 µUSDC). The burner `0x5A347d712765ECDC145AA389534256E0Cb184A1E` holds 0 ETH and 0 test USDC, so nothing settles. There is no `live-receipt.json`. Mock rows keep `receipt: null` and say so.
- Explainer: `docs/EXPLAINER-SCRIPT.md` is a product script of about four and a half minutes. No video was recorded.
- What works: Next.js 15.5.28 App Router, three jobs (briefing, gate, intel), budget cap that skips calls and changes the basket, Live vs Mock labels, catalog of 136 intents, ranked miner names, stand-in prices and a Wikipedia note when the burner cannot pay.
- Gaps: no settled testnet receipt until the burner holds test USDC; no public demo URL; escrow is offered by the engine and ignored (exact only).

This file is the ship note. It is not a portal submission.
