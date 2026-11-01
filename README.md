# MeterBuy

MeterBuy is a personal desk for an operator who needs a fraud check, a web note, or a crypto briefing and does not want to run a miner stack. It buys one ranked answer from [Telegraph](https://telegraphprotocol.com) and uses that answer for one measurable job.

This build is for Telegraph Hackathon Season II, Apps & Agents, Mission 09 Personal Agent. Soft Join is already registered. **Do not submit this repository to the portal unless the registrant says so.**

Public desk: [https://meterbuy.vercel.app](https://meterbuy.vercel.app). Source: [https://github.com/er-s-an/meterbuy](https://github.com/er-s-an/meterbuy). The deployed burner is unfunded, so a Live run falls back to a labeled stand-in and does not print a receipt.

## What it does

1. You pick a job and change the inputs.
2. The desk posts a canonical ask: `intent` plus `params`.
3. The engine returns HTTP 402. Live mode pays with the x402 exact scheme in Sepolia test USDC. Mock mode does not sign.
4. The desk turns the returned fields into a result that depends on them:
   - **Briefing** buys `CRYPTO_PRICE_USD` per symbol, ranks by unit price, and sizes an equal-dollar basket.
   - **Gate** buys `AI_TEXT_DETECTION_GENERAL` and says SEND or HOLD from the verdict and likelihood.
   - **Intel** buys `WEB_SEARCH_GENERAL` and writes a note plus the next link to open.
5. The panel shows the intent, miner, cost, duration, signal hash, decoded receipt, raw body, shaped intel, and the task. A mock row never carries a receipt.

Every Run hits the engine again, or rebuilds a labeled stand-in when payment cannot settle. Moving the basket size after a briefing resizes the same prices and says that the quotes were not bought again.

## Contest track

- Track: Apps & Agents
- Mission: 09 Personal Agent
- Network: Sepolia (`eip155:11155111`)
- Asset: test USDC `0xcc194e1a843B658526D0D5C431f670028582Ae17`
- Engine: `https://devnode.telegraphprotocol.com/engine`

See [docs/CONTEST.md](docs/CONTEST.md) for the rules summary and the five commercial answers. See [docs/EXPLAINER-SCRIPT.md](docs/EXPLAINER-SCRIPT.md) for the product demo script.

## Run it

Node.js 20 or newer.

```bash
cd meterbuy
npm install
cp .env.example .env.local
# put the burner key in .env.local or .env.burner.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The key stays on the server. The browser never receives it.

```bash
npm run build
npm start
npm run smoke
```

`npm run smoke` attempts one real `CRYPTO_PRICE_USD` ask for BTC and writes `docs/evidence/last-attempt.json`. A failed payment is recorded as a failure. It is not labeled as a receipt.

## Fund the burner

The desk reads `TELEGRAPH_EVM_PRIVATE_KEY` from `.env.local` and then `.env.burner.local`. Existing values in the environment win.

Settlement uses an EIP-3009 authorization. The facilitator broadcasts it, so the buyer does not spend ETH on the payment itself. The buyer does need a test USDC balance. Minting that USDC is a transaction from the burner, and that transaction needs Sepolia ETH for gas.

1. Copy the address from `TELEGRAPH_EVM_ADDRESS` (or from the desk status line).
2. Send Sepolia ETH to that address from a faucet you control, such as the Alchemy or Google Cloud Sepolia faucet.
3. Mint test USDC. `10000000` base units is 10 USDC:

```bash
cast send "$USDC_SEPOLIA" "mint(address,uint256)" "$TELEGRAPH_EVM_ADDRESS" 10000000 \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --private-key "$TELEGRAPH_EVM_PRIVATE_KEY"
```

4. Refresh the desk. Live is the default when a key is loaded. If the balance is still zero, Live falls back to Mock and the banner says so.
5. Run `npm run smoke` again. A settled run writes the signal beside `docs/evidence/last-attempt.json`.

The project burner used while building this demo is `0x5A347d712765ECDC145AA389534256E0Cb184A1E`. On 2026-11-02 it held 0 Sepolia ETH and 0 test USDC, so live settlement could not complete. The 402 challenge is still real. See `docs/evidence/last-attempt.json` after a smoke run.

## API

All of these are server routes. They do not accept a private key from the browser.

| Route | What it does |
| --- | --- |
| `POST /api/telegraph/ask` | Runs a desk job. Body: `preset` (`briefing`, `gate`, `intel`), `mode` (`live` or `mock`), `budgetUsd`, `symbols`, `text`, `query`, optional `purseUsd`. |
| `GET /api/telegraph/intents` | Catalog for the three jobs, plus wallet and engine reachability. |
| `GET /api/telegraph/intents?intent=CRYPTO_PRICE_USD` | One intent's request params, response fields, and current board leader. |
| `GET /api/telegraph/signal/{hash}` | Looks up `GET /engine/v1/signal/{hash}`. |
| `GET /api/telegraph/status` | Key loaded or not, balances, default mode, last smoke summary. |

## Reproducibility for judges

1. Clone the repo and install dependencies.
2. Either use Mock, which is labeled and issues no receipt, or fund the burner as above and leave the key in `.env.local`.
3. `npm run dev`, open the desk, and run **Crypto briefing** on `BTC, ETH` under the cap.
4. Change the symbols to `SOL` only and run again. The rank and the recommendation must change with the new price.
5. Run **Fraud gate** twice: once with “Load a plain note”, once with “Load a stiff draft”. The SEND / HOLD stamp must follow the verdict.
6. Run **Web intel** with two different queries. The note must follow the answer.
7. For a live row, open the signal hash. It should resolve on `https://devnode.telegraphprotocol.com/engine/v1/signal/{hash}`.
8. `npm run smoke` should leave an honest `docs/evidence/last-attempt.json`.

## Stack

Next.js App Router, TypeScript, `@x402/fetch`, `@x402/evm`, viem. Payment uses `ExactEvmScheme` on `eip155:11155111` and allows the test USDC asset in `spendControls.allowedAssets`.
