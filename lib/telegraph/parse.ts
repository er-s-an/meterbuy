import type { ChallengeView } from "@/lib/types";

export function scrub(value: string): string {
  return value.replace(/0x[a-fA-F0-9]{64}/g, "0x[redacted]").slice(0, 500);
}

export function decodeBase64Json(value: string): unknown | null {
  try {
    const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function atomicToUsd(amount: string): number {
  const atomic = Number(amount);
  if (!Number.isFinite(atomic)) return 0.01;
  return atomic / 1_000_000;
}

function readAccept(entry: unknown): ChallengeView | null {
  const record = asRecord(entry);
  if (!record) return null;
  const scheme = String(record.scheme || "");
  if (scheme !== "exact") return null;
  const amountAtomic = String(record.amount || record.maxAmountRequired || "");
  if (!amountAtomic) return null;
  return {
    scheme,
    network: String(record.network || "eip155:11155111"),
    amountAtomic,
    amountUsd: atomicToUsd(amountAtomic),
    asset: String(record.asset || ""),
    payTo: String(record.payTo || ""),
  };
}

export function challengeFrom402(headerValue: string | null, body: unknown): ChallengeView | null {
  const decoded = headerValue ? decodeBase64Json(headerValue) : null;
  const sources = [decoded, body];
  for (const source of sources) {
    const record = asRecord(source);
    const accepts = record?.accepts;
    if (!Array.isArray(accepts)) continue;
    for (const entry of accepts) {
      const challenge = readAccept(entry);
      if (challenge) return challenge;
    }
  }
  return null;
}

function walk(value: unknown, visit: (key: string, item: unknown, parent: unknown) => void, depth = 0) {
  if (depth > 7 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 30)) walk(item, visit, depth + 1);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  for (const [key, item] of Object.entries(record)) {
    visit(key.toLowerCase().replace(/[^a-z0-9]/g, ""), item, record);
    walk(item, visit, depth + 1);
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function extractPrice(body: unknown): number | null {
  let found: number | null = null;
  walk(body, (key, value) => {
    if (found != null) return;
    if (!["priceusd", "price", "usdprice"].includes(key)) return;
    const parsed = asNumber(value);
    if (parsed != null && parsed > 0 && parsed < 100_000_000) found = parsed;
  });
  return found;
}

const VERDICTS = ["AI-generated", "Likely AI-generated", "Mixed", "Likely human", "Human"];

export function extractDetection(body: unknown): {
  verdict: string | null;
  aiLikelihood: number | null;
  cues: string[];
} {
  let verdict: string | null = null;
  let aiLikelihood: number | null = null;
  const cues: string[] = [];

  walk(body, (key, value) => {
    if (key === "verdict" && typeof value === "string") {
      const match = VERDICTS.find((item) => item.toLowerCase() === value.toLowerCase());
      if (match) verdict = match;
    }
    if (["ailikelihood", "likelihood", "aiscore"].includes(key)) {
      const parsed = asNumber(value);
      if (parsed != null && parsed >= 0 && parsed <= 1) aiLikelihood = parsed;
    }
    if (key === "cues" && Array.isArray(value)) {
      for (const cue of value) {
        if (typeof cue === "string" && cue.trim()) cues.push(cue.trim());
      }
    }
  });

  return { verdict, aiLikelihood, cues };
}

export function extractSearch(body: unknown): { answer: string | null; sources: string[] } {
  let answer: string | null = null;
  const sources: string[] = [];

  const result = asRecord(body);
  const nested = result && "result" in result ? result.result : body;
  if (typeof nested === "string" && nested.trim()) answer = nested.trim();

  walk(body, (key, value) => {
    if (!answer && ["answer", "brief", "summary", "text", "snippet"].includes(key) && typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 1) answer = trimmed;
    }
    if (["sources", "source", "urls", "url", "citations"].includes(key)) {
      collectSources(value, sources);
    }
  });

  return { answer, sources: unique(sources).slice(0, 6) };
}

function collectSources(value: unknown, into: string[]) {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) into.push(value);
  if (Array.isArray(value)) {
    for (const item of value) collectSources(item, into);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  for (const key of ["url", "href", "link", "source"]) {
    const item = record[key];
    if (typeof item === "string" && /^https?:\/\//i.test(item)) into.push(item);
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function findSignalHash(body: unknown): string | null {
  let found: string | null = null;
  walk(body, (key, value) => {
    if (found || key !== "signalhash" || typeof value !== "string") return;
    if (value.trim()) found = value.trim();
  });
  return found;
}

export function receiptFromHeaders(headers: Headers): unknown | null {
  const names = ["x-telegraph-receipt", "payment-response", "x-payment-response"];
  for (const name of names) {
    const raw = headers.get(name);
    if (!raw) continue;
    return decodeBase64Json(raw) ?? { raw };
  }
  return null;
}

export function readCost(body: unknown): number | null {
  const record = asRecord(body);
  const cost = asNumber(record?.cost_usd);
  if (cost != null && cost >= 0) return cost;
  return null;
}

export function readDuration(body: unknown): number | null {
  const record = asRecord(body);
  const duration = asNumber(record?.duration_ms);
  if (duration != null && duration >= 0) return Math.round(duration);
  return null;
}

export function readMiner(body: unknown): { id: string | null; name: string | null; slug: string | null } {
  const record = asRecord(body);
  const slug = typeof record?.miner_used === "string" ? record.miner_used : null;
  const name = typeof record?.miner_name === "string" ? record.miner_name : null;
  const id =
    typeof record?.miner_id === "string"
      ? record.miner_id
      : typeof record?.registration_id === "string"
        ? record.registration_id
        : null;
  return { id, name, slug };
}
