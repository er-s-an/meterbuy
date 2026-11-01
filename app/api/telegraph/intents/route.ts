import { discoverIntent, getCatalog } from "@/lib/telegraph/discover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("intent")?.trim();
  if (name) {
    if (!/^[A-Z0-9_]{3,80}$/.test(name)) {
      return Response.json({ error: "Intent names are uppercase catalog ids." }, { status: 400 });
    }
    const found = await discoverIntent(name);
    return Response.json(
      {
        intent: name,
        listed: found.listed,
        miner: found.miner,
        request: found.detail?.request ?? null,
        response: found.detail?.response ?? null,
        note: "The board leader is public supply. The engine still routes the paid ask.",
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const catalog = await getCatalog();
  return Response.json(catalog, { headers: { "cache-control": "no-store" } });
}
