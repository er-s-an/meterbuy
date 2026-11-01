# Contest context — MeterBuy

**Submission status: not submitted.** Soft Join is already done. Do not re-register. Do not submit to https://hackathon.telegraphprotocol.com/ until the registrant explicitly says 交.

## Registration

- When: 2026-11-01, about 08:05 HKT
- Who: Individual, Jiachen Xie, Discord `er_s_an`
- Labels on the registration: MeterBuy, Apps & Agents, Mission 09 Personal Agent, Intent M2M
- Confirmation: the portal dialog said "You're registered."
- Working note: `/workspace/competitions/telegraph-s2/SOFT-JOIN-2026-11-01.md`

## Track and mission

- Event: Telegraph Hackathon Season II, 1 November to 1 December 2026
- Deadline: 1 December 2026, 23:59 UTC (about 2 December 2026, 07:59 HKT)
- Track: Apps & Agents
- Mission: 09 Personal Agent
- Problem, in the mission's words: personal agents run on stale local context, with no wallet, no market, and no way to pay for a fresh answer
- MeterBuy's buyer inside that mission: a personal or small-team operator who will pay per ranked supply for a fraud check, a search, or a crypto briefing, and will not operate a miner

The 14 November checkpoint is a progress check, not a submission and not an elimination.

## Rules that bind this build

Source: the Season II rules page, read 2026-11-02. This is a summary, not a substitute for the page.

- Apps & Agents must buy intelligence through Telegraph and use it. A chatbot with a payment bolted on is not the ask.
- At least one real machine-to-machine purchase on testnet, then a meaningful task that uses what came back.
- Show the provider, the cost, and a receipt or signal a stranger can open.
- The same inputs must be runnable again. Change them and the result must change.
- Scoring bar called out for this track: at least 70/100 overall and at least 24/35 on technical quality, plus a working Telegraph purchase.
- Commercial viability, in the rules: a clear user or buyer, a genuine problem, a useful result, sensible costs, and a believable path to adoption.
- Prize pool is 10,000 USD across the season, with an Apps delivery slice and a separate December challenge. This file does not treat the December challenge as an extension of the main deadline.
- One registration covers all tracks. This project is only the Apps & Agents entry. It does not also claim a miner or an evaluator.

## Five commercial questions

These are the five short answers the Apps & Agents form asks for. They describe the product a judge can try today. They are not a claim that anyone has paid on mainnet.

### 01 Who is it for?

A solo operator or a small team that already sends messages, checks a book of coins, or looks something up before acting. The job shows up several times a day: before a message goes out, before a note is forwarded, and at the open of a watchlist. They will pay a cent-scale quote. They will not stand up a miner, keep provider API keys, or guess which source is currently ranked.

### 02 What does it improve?

They stop treating "ask a model" and "pay a data vendor for a month" as the only choices. Each check has a price, a provider, and a result that changes the next action: send or hold, which coin a fixed purse buys the most of, or which link to open before forwarding a note. Spend is capped in the same step, so a six-symbol watchlist cannot silently overrun a budget.

### 03 What does it do today?

On Sepolia, the desk buys `CRYPTO_PRICE_USD`, `AI_TEXT_DETECTION_GENERAL`, or `WEB_SEARCH_GENERAL` through the engine's exact scheme and renders the task from the returned fields. If the burner has no test USDC, the same screen falls back to a labeled stand-in and refuses to print a receipt. Judges can change the inputs and run the job again. A smoke script records the latest real attempt, success or failure, in `docs/evidence/last-attempt.json`.

### 04 Why would someone adopt it?

The operator already has the task. MeterBuy removes the part they do not want to own: discovery, ranking, and per-call payment. The receipt is the reason to trust the number enough to act, and the cap is the reason to leave it running. Adoption starts as a desk beside the work, not as a new network to operate. A later version can sit in a heartbeat loop. This submission shows the purchase and the decision, which is the part a buyer can judge.

### 05 How can someone try it?

Open the public demo, or clone the repo and run `npm install` then `npm run dev`. Choose a job, edit the symbols or the draft or the query, set a max spend, and press Run the desk. Mock needs no funds and is labeled. Live needs the burner funded with test USDC, as the README describes. Then open any signal hash on a paid row. `npm run smoke` repeats one BTC price purchase from the command line.

## What this entry refuses

- A receipt that was not settled, labeled as if it were
- A generic chat box with no intent and no payment path
- One flow tagged as several missions
- A portal submit performed by the build agent
