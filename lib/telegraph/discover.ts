import "server-only";

import type { JobCatalog, MinerPick, Preset, PublicCatalog } from "@/lib/types";
import { engineUrl, nodeUrl, QUOTE_USD } from "@/lib/telegraph/config";
import { getJson } from "@/lib/telegraph/http";
import { readWallet } from "@/lib/telegraph/wallet";

type IntentDetail = {
  intent_name?: string;
  miner_count?: number;
  request?: { params?: { name?: string; type?: string; required?: boolean; description?: string }[] };
  response?: { fields?: { name?: string; type?: string; description?: string }[] };
};

type MinerApiRow = {
  id?: string;
  name?: string;
  slug?: string;
  activation_status?: string;
  scores?: { intent_id?: string; rank?: number; score?: number; epoch_id?: number }[];
};

const JOBS: { id: Preset; intent: string; title: string; blurb: string }[] = [
  {
    id: "briefing",
    intent: "CRYPTO_PRICE_USD",
    title: "Briefing",
    blurb: "Unit prices become an equal-dollar basket.",
  },
  {
    id: "gate",
    intent: "AI_TEXT_DETECTION_GENERAL",
    title: "Gate",
    blurb: "A verdict decides send or hold.",
  },
  {
    id: "intel",
    intent: "WEB_SEARCH_GENERAL",
    title: "Intel",
    blurb: "A search becomes a note with a next step.",
  },
];

function emptyMiner(): MinerPick {
  return { id: null, name: null, slug: null, rank: null, score: null, selection: "unknown" };
}

export function pickMiner(rows: MinerApiRow[] | null | undefined): MinerPick {
  const ranked = (rows || [])
    .map((row) => {
      const scoreRow = row.scores?.find((score) => typeof score.rank === "number") || row.scores?.[0];
      return {
        row,
        rank: typeof scoreRow?.rank === "number" ? scoreRow.rank : 999,
        score: typeof scoreRow?.score === "number" ? scoreRow.score : null,
      };
    })
    .filter((item) => item.row.slug || item.row.id)
    .sort((a, b) => a.rank - b.rank);
  const active = ranked.find((item) => item.row.activation_status === "active") || ranked[0];
  if (!active) return emptyMiner();
  return {
    id: active.row.id ?? null,
    name: active.row.name ?? active.row.slug ?? null,
    slug: active.row.slug ?? null,
    rank: active.rank === 999 ? null : active.rank,
    score: active.score,
    selection: "public-leaderboard",
  };
}

export async function discoverIntent(intent: string): Promise<{ detail: IntentDetail | null; miner: MinerPick; listed: number }> {
  const [detailResult, minersResult] = await Promise.allSettled([
    getJson<IntentDetail>(`${engineUrl()}/v1/intents/${encodeURIComponent(intent)}`),
    getJson<MinerApiRow[]>(`${nodeUrl()}/api/miners?intent=${encodeURIComponent(intent)}`),
  ]);
  const detail = detailResult.status === "fulfilled" ? detailResult.value : null;
  const miners = minersResult.status === "fulfilled" ? minersResult.value : null;
  const miner = pickMiner(miners);
  return {
    detail,
    miner,
    listed: detail?.miner_count ?? (Array.isArray(miners) ? miners.length : 0),
  };
}

export async function getCatalog(): Promise<PublicCatalog> {
  const wallet = await readWallet();
  let epoch: number | null = null;
  let intentCount: number | null = null;
  let reachable = false;

  try {
    const intents = await getJson<{ count?: number; epoch?: number }>(`${engineUrl()}/v1/intents`);
    reachable = true;
    intentCount = typeof intents.count === "number" ? intents.count : null;
    epoch = typeof intents.epoch === "number" ? intents.epoch : null;
  } catch {
    reachable = false;
  }

  const jobs: JobCatalog[] = await Promise.all(
    JOBS.map(async (job) => {
      const found = reachable
        ? await discoverIntent(job.intent).catch(() => null)
        : null;
      return {
        ...job,
        miner: found?.miner ?? emptyMiner(),
        listed: found?.listed ?? 0,
      };
    }),
  );

  return {
    engine: engineUrl(),
    reachable,
    epoch,
    intentCount,
    quoteUsd: QUOTE_USD,
    wallet,
    jobs,
  };
}
