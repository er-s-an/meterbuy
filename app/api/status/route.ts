import { engineUrl } from "@/lib/telegraph/config";
import { getJson } from "@/lib/telegraph/http";
import { readWallet } from "@/lib/telegraph/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const wallet = await readWallet();
  let engine = { reachable: false, intentCount: null as number | null };
  try {
    const intents = await getJson<{ count?: number }>(`${engineUrl()}/v1/intents`, 8_000);
    engine = { reachable: true, intentCount: intents.count ?? null };
  } catch {
    engine = { reachable: false, intentCount: null };
  }
  return Response.json(
    { wallet, engine, submit: false },
    { headers: { "cache-control": "no-store" } },
  );
}
