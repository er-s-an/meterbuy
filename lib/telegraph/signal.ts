import "server-only";

import { engineUrl, signalUrl } from "@/lib/telegraph/config";
import { request } from "@/lib/telegraph/http";
import { scrub } from "@/lib/telegraph/parse";

const HASH = /^0x[0-9a-fA-F]{16,128}$/;

export async function readSignal(hash: string): Promise<{
  ok: boolean;
  status: number;
  hash: string;
  url: string;
  signal: unknown;
  error: string | null;
}> {
  const trimmed = hash.trim();
  if (!HASH.test(trimmed)) {
    return {
      ok: false,
      status: 400,
      hash: trimmed,
      url: "",
      signal: null,
      error: "A signal hash looks like 0x followed by hex.",
    };
  }
  const url = signalUrl(trimmed);
  try {
    const response = await request(url, { method: "GET" }, 12_000);
    const text = await response.text();
    let signal: unknown = null;
    try {
      signal = text ? JSON.parse(text) : null;
    } catch {
      signal = { raw: text.slice(0, 800) };
    }
    return {
      ok: response.ok,
      status: response.status,
      hash: trimmed,
      url,
      signal,
      error: response.ok ? null : `Signal lookup returned ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      hash: trimmed,
      url,
      signal: null,
      error: scrub(error instanceof Error ? error.message : "Signal lookup failed."),
    };
  }
}

export function engineRoot() {
  return engineUrl();
}
