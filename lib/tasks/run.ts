import "server-only";

import { randomUUID } from "node:crypto";
import type { CallRecord, Preset, RequestedMode, RunResult, SkippedCall, TaskView } from "@/lib/types";
import { buildAskBody, paidAsk, probeAsk } from "@/lib/telegraph/ask";
import { QUOTE_USD, signalUrl } from "@/lib/telegraph/config";
import { saveLiveRun } from "@/lib/telegraph/evidence";
import { discoverIntent } from "@/lib/telegraph/discover";
import { detectText, standInPrice, standInSearch } from "@/lib/telegraph/mock";
import { extractDetection, extractPrice, extractSearch } from "@/lib/telegraph/parse";
import { readWallet } from "@/lib/telegraph/wallet";
import { BASKET_USD, briefingFromPrices, gateFromDetection, noteFromSearch } from "@/lib/tasks/outcomes";

type Unit = {
  label: string;
  intent: string;
  params: Record<string, string>;
};

type RunInput = {
  preset?: unknown;
  mode?: unknown;
  budgetUsd?: unknown;
  purseUsd?: unknown;
  symbols?: unknown;
  text?: unknown;
  query?: unknown;
};

const PRESETS = new Set<Preset>(["briefing", "gate", "intel"]);

export async function runDesk(input: RunInput): Promise<RunResult> {
  const preset = parsePreset(input.preset);
  const requestedMode = input.mode === "mock" ? "mock" : "live";
  const budgetUsd = parseBudget(input.budgetUsd);
  const purseUsd = parsePurse(input.purseUsd);
  const units = unitsFor(preset, input);
  const wallet = await readWallet();
  const calls: CallRecord[] = [];
  const skipped: SkippedCall[] = [];
  let quotedUsd = 0;
  let settledUsd = 0;

  for (const unit of units) {
    const discovered = await discoverIntent(unit.intent).catch(() => null);
    const miner = discovered?.miner ?? {
      id: null,
      name: null,
      slug: null,
      rank: null,
      score: null,
      selection: "unknown" as const,
    };
    const body = buildAskBody(unit.intent, unit.params);
    const probed = await probeAsk(body);
    const quote = probed.challenge?.amountUsd ?? QUOTE_USD;

    if (quotedUsd + quote > budgetUsd + 1e-9) {
      skipped.push({
        label: unit.label,
        reason: `Over the ${formatMoney(budgetUsd)} cap. This call was not sent.`,
      });
      continue;
    }

    quotedUsd += quote;
    const started = Date.now();
    const wantLive = requestedMode === "live" && wallet.canPay;

    if (!wantLive) {
      const reason =
        requestedMode === "mock"
          ? "Mock was selected. No signature was sent."
          : wallet.canPay
            ? "Live was not attempted."
            : "The burner cannot pay, so this call fell back to Mock. No receipt was issued.";
      calls.push(
        await mockCall({
          unit,
          miner,
          challenge: probed.challenge,
          quote,
          started,
          reason: probed.error ? `${reason} ${probed.error}` : reason,
        }),
      );
      continue;
    }

    const paid = await paidAsk(body, budgetUsd - settledUsd);
    if (!paid.ok) {
      calls.push(
        await mockCall({
          unit,
          miner,
          challenge: probed.challenge,
          quote,
          started,
          reason: paid.error || "Payment failed. Fell back to Mock. No receipt was issued.",
        }),
      );
      continue;
    }

    const intel = intelFromLive(preset, unit, paid.body);
    if (!intel) {
      calls.push({
        intent: unit.intent,
        label: unit.label,
        paid: true,
        source: "unreadable",
        sourceDetail: "telegraph",
        fallbackReason: null,
        miner: servedMiner(paid.miner, miner),
        quotedUsd: quote,
        settledUsd: paid.costUsd ?? quote,
        durationMs: paid.durationMs,
        signalHash: paid.signalHash,
        signalUrl: paid.signalHash ? signalUrl(paid.signalHash) : null,
        signal: paid.signal,
        receipt: paid.receipt,
        challenge: probed.challenge,
        intel: null,
        raw: clipRaw(paid.body),
      });
      settledUsd += paid.costUsd ?? quote;
      continue;
    }

    const cost = paid.costUsd ?? quote;
    settledUsd += cost;
    calls.push({
      intent: unit.intent,
      label: unit.label,
      paid: true,
      source: "telegraph",
      sourceDetail: "telegraph",
      fallbackReason: null,
      miner: servedMiner(paid.miner, miner),
      quotedUsd: quote,
      settledUsd: cost,
      durationMs: paid.durationMs,
      signalHash: paid.signalHash,
      signalUrl: paid.signalHash ? signalUrl(paid.signalHash) : null,
      signal: paid.signal,
      receipt: paid.receipt,
      challenge: probed.challenge,
      intel,
      raw: clipRaw(paid.body),
    });
  }

  const paidCount = calls.filter((call) => call.paid).length;
  const mode = paidCount === 0 ? "mock" : paidCount === calls.length ? "live" : "mixed";
  const task = taskFrom(preset, calls, skipped, purseUsd);

  const result: RunResult = {
    runId: randomUUID(),
    computedAt: new Date().toISOString(),
    preset,
    requestedMode,
    mode,
    modeReason: modeReason(requestedMode, mode, wallet.canPay),
    paid: paidCount > 0,
    budgetUsd,
    settledUsd: roundUsd(settledUsd),
    quotedUsd: roundUsd(quotedUsd),
    wallet,
    calls,
    skipped,
    task,
  };
  if (result.paid) saveLiveRun(result);
  return result;
}

function servedMiner(
  paid: { id: string | null; name: string | null; slug: string | null },
  board: CallRecord["miner"],
): CallRecord["miner"] {
  const fromEngine = Boolean(paid.slug || paid.name || paid.id);
  return {
    id: paid.id ?? board.id,
    name: paid.name ?? board.name,
    slug: paid.slug ?? board.slug,
    rank: board.rank,
    score: board.score,
    selection: fromEngine ? "engine-response" : board.selection,
  };
}

function clipRaw(value: unknown): unknown {
  try {
    const text = JSON.stringify(value);
    if (!text) return value;
    if (text.length <= 80_000) return value;
    return { truncated: true, preview: text.slice(0, 8_000) };
  } catch {
    return null;
  }
}

function modeReason(requested: RequestedMode, mode: RunResult["mode"], canPay: boolean): string {
  if (requested === "mock") return "You chose Mock. The desk did not sign a payment, and it did not invent a receipt.";
  if (mode === "live") return "Settled with the exact scheme on Sepolia. The task below uses the miner intel.";
  if (mode === "mixed") return "Some calls settled and some fell back. Only settled rows carry a receipt.";
  if (!canPay) {
    return "Live was requested. The burner cannot pay, so the desk used a labeled stand-in and issued no receipt.";
  }
  return "Live was requested, the payment did not settle, and the desk fell back to a labeled stand-in.";
}

async function mockCall(input: {
  unit: Unit;
  miner: CallRecord["miner"];
  challenge: CallRecord["challenge"];
  quote: number;
  started: number;
  reason: string;
}): Promise<CallRecord> {
  const intel = await standInIntel(input.unit);
  return {
    intent: input.unit.intent,
    label: input.unit.label,
    paid: false,
    source: intel ? "stand-in" : "unreadable",
    sourceDetail: String(intel?.sourceDetail || "stand-in:none"),
    fallbackReason: input.reason,
    miner: { ...input.miner, selection: input.miner.slug ? "public-leaderboard" : "unknown" },
    quotedUsd: input.quote,
    settledUsd: 0,
    durationMs: Math.max(0, Date.now() - input.started),
    signalHash: null,
    signalUrl: null,
    signal: null,
    receipt: null,
    challenge: input.challenge,
    intel,
    raw: null,
  };
}

async function standInIntel(unit: Unit): Promise<Record<string, unknown> | null> {
  if (unit.intent === "CRYPTO_PRICE_USD") {
    const price = await standInPrice(unit.params.symbol);
    return { symbol: unit.params.symbol, price_usd: price.priceUsd, sourceDetail: price.detail };
  }
  if (unit.intent === "AI_TEXT_DETECTION_GENERAL") {
    const detection = detectText(unit.params.text);
    return { ...detection, ai_likelihood: detection.aiLikelihood, sourceDetail: "stand-in:desk-heuristic" };
  }
  const search = await standInSearch(unit.params.query);
  if (!search.answer) return { answer: null, sources: [], sourceDetail: search.detail };
  return { answer: search.answer, sources: search.sources, sourceDetail: search.detail };
}

function intelFromLive(preset: Preset, unit: Unit, body: unknown): Record<string, unknown> | null {
  if (preset === "briefing") {
    const price = extractPrice(body);
    if (price == null) return null;
    return { symbol: unit.params.symbol, price_usd: price, sourceDetail: "telegraph" };
  }
  if (preset === "gate") {
    const detection = extractDetection(body);
    if (!detection.verdict && detection.aiLikelihood == null) return null;
    return {
      verdict: detection.verdict,
      ai_likelihood: detection.aiLikelihood,
      cues: detection.cues,
      sourceDetail: "telegraph",
    };
  }
  const search = extractSearch(body);
  if (!search.answer) return null;
  return { answer: search.answer, sources: search.sources, sourceDetail: "telegraph" };
}

function taskFrom(preset: Preset, calls: CallRecord[], skipped: SkippedCall[], purseUsd: number): TaskView {
  if (preset === "briefing") {
    const briefing = briefingFromPrices(
      calls.map((call) => ({
        symbol: call.label,
        priceUsd: typeof call.intel?.price_usd === "number" ? call.intel.price_usd : null,
        source: call.sourceDetail,
      })),
      purseUsd,
    );
    const skipLines = skipped.map((item) => `${item.label} skipped: ${item.reason}`);
    return {
      headline: briefing.headline,
      outcome: briefing.outcome,
      recommendation: briefing.recommendation,
      decision: null,
      lines: [...briefing.lines, ...skipLines],
      dependsOn: briefing.dependsOn,
      rows: briefing.basket,
    };
  }

  if (preset === "gate") {
    const call = calls[0];
    const gate = gateFromDetection({
      verdict: typeof call?.intel?.verdict === "string" ? call.intel.verdict : null,
      aiLikelihood: typeof call?.intel?.ai_likelihood === "number" ? call.intel.ai_likelihood : null,
      cues: Array.isArray(call?.intel?.cues) ? call.intel.cues.filter((cue) => typeof cue === "string") : [],
      source: call?.sourceDetail || "none",
    });
    return {
      headline: gate.headline,
      outcome: gate.outcome,
      recommendation: gate.recommendation,
      decision: gate.decision,
      lines: gate.lines,
      dependsOn: gate.dependsOn,
      rows: [],
    };
  }

  const call = calls[0];
  const note = noteFromSearch({
    query: call?.label || "",
    answer: typeof call?.intel?.answer === "string" ? call.intel.answer : null,
    sources: Array.isArray(call?.intel?.sources)
      ? call.intel.sources.filter((item): item is string => typeof item === "string")
      : [],
    source: call?.sourceDetail || "none",
  });
  return {
    headline: note.headline,
    outcome: note.outcome,
    recommendation: note.recommendation,
    decision: null,
    lines: [...note.lines, ...skipped.map((item) => item.reason)],
    dependsOn: note.dependsOn,
    rows: [],
  };
}

function unitsFor(preset: Preset, input: RunInput): Unit[] {
  if (preset === "briefing") {
    const symbols = parseSymbols(input.symbols);
    if (symbols.length === 0) throw new Error("Enter at least one symbol, such as BTC.");
    return symbols.map((symbol) => ({
      label: symbol,
      intent: "CRYPTO_PRICE_USD",
      params: { symbol },
    }));
  }
  if (preset === "gate") {
    const text = typeof input.text === "string" ? input.text.trim() : "";
    if (text.length < 1) throw new Error("Paste the text the gate should judge.");
    if (text.length > 8000) throw new Error("Keep the text under 8,000 characters.");
    return [{ label: "Pasted text", intent: "AI_TEXT_DETECTION_GENERAL", params: { text } }];
  }
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (query.length < 2) throw new Error("Enter a search query.");
  if (query.length > 400) throw new Error("Keep the query under 400 characters.");
  return [{ label: query, intent: "WEB_SEARCH_GENERAL", params: { query } }];
}

function parsePreset(value: unknown): Preset {
  if (typeof value === "string" && PRESETS.has(value as Preset)) return value as Preset;
  throw new Error("Choose a briefing, a gate, or an intel note.");
}

function parsePurse(value: unknown): number {
  if (value == null || value === "") return BASKET_USD;
  const purse = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(purse)) throw new Error("Set a basket size.");
  const rounded = Math.round(purse);
  if (rounded < 10 || rounded > 10_000) throw new Error("The basket must be between $10 and $10,000.");
  return rounded;
}

function parseBudget(value: unknown): number {
  const budget = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(budget)) throw new Error("Set a budget.");
  const rounded = Math.round(budget * 100) / 100;
  if (rounded < 0.01 || rounded > 1) throw new Error("The cap must be between $0.01 and $1.00.");
  return rounded;
}

function parseSymbols(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : typeof value === "string" ? value : "";
  const symbols = raw
    .split(/[^A-Za-z0-9]+/)
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z0-9]{1,12}$/.test(symbol));
  return [...new Set(symbols)].slice(0, 6);
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
