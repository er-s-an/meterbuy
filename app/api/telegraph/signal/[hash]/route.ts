import { readSignal } from "@/lib/telegraph/signal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ hash: string }> }) {
  const { hash } = await context.params;
  const result = await readSignal(decodeURIComponent(hash));
  return Response.json(result, {
    status: result.ok ? 200 : result.status,
    headers: { "cache-control": "no-store" },
  });
}
