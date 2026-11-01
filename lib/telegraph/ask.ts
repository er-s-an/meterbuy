import "server-only";

import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import type { ChallengeView } from "@/lib/types";
import { burnerAccount, engineUrl, networkId, rpcUrl, usdcAddress } from "@/lib/telegraph/config";
import { request } from "@/lib/telegraph/http";
import {
  challengeFrom402,
  findSignalHash,
  readCost,
  readDuration,
  readMiner,
  receiptFromHeaders,
  scrub,
} from "@/lib/telegraph/parse";

export type AskBody = {
  intent: string;
  params: Record<string, string>;
};

export function buildAskBody(intent: string, params: Record<string, string>): AskBody {
  return { intent, params };
}

export async function probeAsk(body: AskBody): Promise<{ challenge: ChallengeView | null; error: string | null }> {
  try {
    const response = await request(
      `${engineUrl()}/v1/ask`,
      { method: "POST", body: JSON.stringify(body) },
      20_000,
    );
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text.slice(0, 400) };
    }
    if (response.status !== 402) {
      return {
        challenge: null,
        error: `Expected a 402 challenge and received ${response.status}.`,
      };
    }
    const challenge = challengeFrom402(response.headers.get("payment-required"), parsed);
    return {
      challenge,
      error: challenge ? null : "The 402 response did not include an exact-scheme price.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Challenge request failed.";
    return { challenge: null, error: scrub(message) };
  }
}

export type PaidAsk = {
  ok: boolean;
  body: unknown;
  receipt: unknown | null;
  signalHash: string | null;
  signal: unknown | null;
  costUsd: number | null;
  durationMs: number | null;
  miner: { id: string | null; name: string | null; slug: string | null };
  error: string | null;
};

export async function paidAsk(body: AskBody, remainingUsd: number): Promise<PaidAsk> {
  const account = burnerAccount();
  if (!account) {
    return emptyPaid("No burner key is available for a signature.");
  }

  const capUsd = Math.max(0.01, Math.min(remainingUsd, 1));
  const atomicCap = String(Math.floor(capUsd * 1_000_000));
  const started = Date.now();

  try {
    const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [
        {
          network: networkId() as `${string}:${string}`,
          client: new ExactEvmScheme(
            toClientEvmSigner(
              account,
              createPublicClient({ chain: sepolia, transport: http(rpcUrl()) }),
            ),
          ),
        },
      ],
      policies: [
        (_version, requirements) => requirements.filter((item) => item.scheme === "exact"),
      ],
      paymentRequirementsSelector: (_version, requirements) => {
        const exact = requirements.find((item) => item.scheme === "exact");
        if (!exact) throw new Error("The challenge has no exact scheme to sign.");
        return exact;
      },
      spendControls: {
        maxAmountPerPayment: `$${capUsd.toFixed(2)}`,
        allowedAssets: [
          {
            network: networkId() as `${string}:${string}`,
            asset: usdcAddress(),
            maxAmountPerPayment: atomicCap,
          },
        ],
      },
    });

    const response = await paidFetch(`${engineUrl()}/v1/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text.slice(0, 800) };
    }

    if (!response.ok) {
      return emptyPaid(`Paid ask returned ${response.status}. ${scrub(text)}`);
    }

    const receipt = receiptFromHeaders(response.headers);
    const signalHash = findSignalHash(parsed);
    const costUsd = readCost(parsed);
    const settled = Boolean(receipt || signalHash || (costUsd != null && costUsd > 0));
    if (!settled) {
      return emptyPaid("The engine answered without a receipt, signal hash, or cost. Not labeled live.");
    }

    let signal: unknown | null = null;
    if (signalHash) {
      try {
        const signalResponse = await request(
          `${engineUrl()}/v1/signal/${encodeURIComponent(signalHash)}`,
          { method: "GET" },
          12_000,
        );
        signal = signalResponse.ok ? await signalResponse.json() : { status: signalResponse.status };
      } catch (error) {
        signal = { error: scrub(error instanceof Error ? error.message : "Signal lookup failed.") };
      }
    }

    return {
      ok: true,
      body: parsed,
      receipt,
      signalHash,
      signal,
      costUsd,
      durationMs: readDuration(parsed) ?? Date.now() - started,
      miner: readMiner(parsed),
      error: null,
    };
  } catch (error) {
    return emptyPaid(scrub(error instanceof Error ? error.message : "Payment failed."));
  }
}

function emptyPaid(error: string): PaidAsk {
  return {
    ok: false,
    body: null,
    receipt: null,
    signalHash: null,
    signal: null,
    costUsd: null,
    durationMs: null,
    miner: { id: null, name: null, slug: null },
    error,
  };
}
