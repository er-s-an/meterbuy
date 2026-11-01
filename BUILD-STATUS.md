# MeterBuy build status

Times are Asia/Shanghai.

- 2026-11-02 03:21: Soft Join remains registered. **No portal Submit has been performed. Do not Submit until the user says 交. Do not re-register.**
- Live demo: https://meterbuy.vercel.app (public production alias, HTTP 200). The per-deployment URL is behind Vercel authentication. Vercel project `meterbuy` under the logged-in CLI account. GitHub is not connected on that Vercel account, so this deploy was a CLI upload and later pushes do not auto-deploy.
- GitHub: https://github.com/er-s-an/meterbuy (public, `er-s-an`, branch `main`).
- `npm run build` succeeded on Next.js 15.5.28 (App Router). Routes: `/`, `/sandbox`, `/api/telegraph/ask`, `/api/telegraph/intents`, `/api/telegraph/signal/[hash]`, `/api/telegraph/status`.
- M2M proof: **blocked, unfunded. Not a receipt.** Smoke at 2026-11-02 03:06 CST (`docs/evidence/last-attempt.json`, `at` 2026-11-01T19:06:42.403Z) loaded the burner `0x5A347d712765ECDC145AA389534256E0Cb184A1E`, read 0 ETH and 0 test USDC, signed an x402 exact payload (`signed: true`), and the engine still returned HTTP 402. Challenge: scheme `exact`, network `eip155:11155111`, 10000 µUSDC ($0.01), asset `0xcc194e1a843B658526D0D5C431f670028582Ae17`, payTo `0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b`. `signalHash` is null. `receipt` is null. Phase `payment-failed`.
- Production check the same morning: `GET /api/telegraph/status` reports `keyLoaded: true`, `defaultMode: live`, `canPay: false`, engine reachable, 136 intents, `submit: false`. A Mock `SOL` briefing returned a stand-in price, `receipt: null`, and a rank that uses that price. A Live gate request fell back to a labeled Mock, decision SEND, `receipt: null`.
- Explainer: `docs/EXPLAINER-SCRIPT.md` is a product script of about four and a half minutes. No video in this pass.
- Gaps: no settled testnet signal until the burner holds test USDC (minting also needs Sepolia ETH for gas). Escrow is offered on the 402 and ignored (exact only). Paid asks that later succeed may hit the Vercel function time limit, and the serverless disk cannot append `docs/evidence/` (the writer swallows that error). The public ask route can spend the burner once it is funded, capped per run.

This file is the ship note. It is not a portal submission.
