import { getCatalog } from "@/lib/telegraph/discover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCatalog();
  return Response.json(catalog, { headers: { "cache-control": "no-store" } });
}
