import { engineUrl, networkId, privateKey, QUOTE_USD, usdcAddress } from "@/lib/telegraph/config";
import { readEvidenceIndex, readLastAttempt } from "@/lib/telegraph/evidence";
import { getJson } from "@/lib/telegraph/http";
import { readWallet } from "@/lib/telegraph/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function summarizeAttempt(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    at: typeof record.at === "string" ? record.at : null,
    ok: record.ok === true,
    paid: record.paid === true,
    phase: typeof record.phase === "string" ? record.phase : null,
    httpStatus: typeof record.httpStatus === "number" ? record.httpStatus : null,
    signalHash: typeof record.signalHash === "string" ? record.signalHash : null,
    error: typeof record.error === "string" ? record.error.slice(0, 500) : null,
    note: typeof record.note === "string" ? record.note.slice(0, 500) : null,
  };
}

export async function GET() {
  const wallet = await readWallet();
  const keyLoaded = Boolean(privateKey());
  let engine = { reachable: false, intentCount: null as number | null };
  try {
    const intents = await getJson<{ count?: number }>(`${engineUrl()}/v1/intents`, 8_000);
    engine = { reachable: true, intentCount: typeof intents.count === "number" ? intents.count : null };
  } catch {
    engine = { reachable: false, intentCount: null };
  }

  return Response.json(
    {
      wallet,
      engine,
      keyLoaded,
      defaultMode: keyLoaded ? "live" : "mock",
      network: networkId(),
      usdc: usdcAddress(),
      quoteUsd: QUOTE_USD,
      evidence: readEvidenceIndex(),
      lastAttempt: summarizeAttempt(readLastAttempt()),
      submit: false,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
