# Evidence

`npm run smoke` writes these files. They contain no private key.

| File | What it is |
| --- | --- |
| `last-attempt.json` | Latest `npm run smoke` result. Includes the 402 challenge and, when the client signs, the unpaid follow-up. `paid: false` means this file is not a receipt. |
| `402-challenge.json` | A real unpaid `POST /engine/v1/ask`. Status 402, exact scheme, test USDC, payee. Not a receipt. |
| `wallet-status.json` | Burner address and Sepolia ETH / test USDC balances. |
| `smoke-latest.json` | An earlier smoke summary. `m2m: blocked-unfunded` means no receipt was invented. |
| `live-*.json` | Written only after a settled exact payment. Absent while the burner is unfunded. |

`m2m` values:

- `blocked-unfunded` — the engine challenged, and the burner could not pay. No receipt was invented.
- `settled` — one real `CRYPTO_PRICE_USD` buy completed and the briefing used that price.
- `payment-failed` — the burner could pay, and settlement did not complete.
- `challenge-missing` or `error` — the engine path itself failed. Smoke exits 1.

Set `SMOKE_REQUIRE_LIVE=1` to exit 2 unless `m2m` is `settled`.
