import fs from "node:fs";
import path from "node:path";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createPublicClient, formatEther, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const root = process.cwd();
const evidenceDir = path.join(root, "docs", "evidence");
const intent = "CRYPTO_PRICE_USD";
const params = { symbol: "BTC" };
const usdcFallback = "0xcc194e1a843B658526D0D5C431f670028582Ae17";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function scrub(value) {
  return String(value || "").replace(/0x[a-fA-F0-9]{64}/g, "0x[redacted]").slice(0, 800);
}

function decodeBase64Json(value) {
  try {
    const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function challengeFrom(headerValue, body) {
  const decoded = headerValue ? decodeBase64Json(headerValue) : null;
  for (const source of [decoded, body]) {
    const accepts = source && typeof source === "object" ? source.accepts : null;
    if (!Array.isArray(accepts)) continue;
    const exact = accepts.find((entry) => entry && entry.scheme === "exact");
    if (!exact) continue;
    return {
      scheme: "exact",
      network: exact.network || null,
      amountAtomic: exact.amount || null,
      price: exact.price || null,
      asset: exact.asset || null,
      payTo: exact.payTo || null,
    };
  }
  return null;
}

function findSignalHash(value, depth = 0) {
  if (!value || depth > 6) return null;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) {
      const found = findSignalHash(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value)) {
    if (key.toLowerCase().replace(/[^a-z]/g, "") === "signalhash" && typeof item === "string" && item.trim()) {
      return item.trim();
    }
    const found = findSignalHash(item, depth + 1);
    if (found) return found;
  }
  return null;
}

function writeAttempt(attempt) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, "last-attempt.json");
  fs.writeFileSync(file, JSON.stringify(attempt, null, 2));
  return file;
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env.burner.local"));

const engine = (process.env.TELEGRAPH_ENGINE_URL || "https://devnode.telegraphprotocol.com/engine").replace(/\/$/, "");
const rpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const usdc = process.env.USDC_SEPOLIA || usdcFallback;
const network = process.env.EVM_NETWORK || "eip155:11155111";
const key = process.env.TELEGRAPH_EVM_PRIVATE_KEY?.trim() || "";
const keyLoaded = /^0x[0-9a-fA-F]{64}$/.test(key);

const attempt = {
  at: new Date().toISOString(),
  intent,
  params,
  engine,
  network,
  usdc,
  keyLoaded,
  address: null,
  balances: { eth: null, usdc: null },
  challenge: null,
  httpStatus: null,
  paid: false,
  ok: false,
  phase: "start",
  signalHash: null,
  signalUrl: null,
  receipt: null,
  costUsd: null,
  miner: null,
  error: null,
  note: "Honest smoke of one CRYPTO_PRICE_USD ask. A failed payment is not labeled as a receipt.",
};

const body = JSON.stringify({ intent, params });

try {
  const probe = await fetch(`${engine}/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body,
  });
  const probeText = await probe.text();
  let probeJson = null;
  try {
    probeJson = probeText ? JSON.parse(probeText) : null;
  } catch {
    probeJson = { raw: probeText.slice(0, 400) };
  }
  attempt.httpStatus = probe.status;
  attempt.challenge = challengeFrom(probe.headers.get("payment-required"), probeJson);
  attempt.phase = probe.status === 402 ? "402-challenge" : "probe";
  if (probe.status !== 402) {
    attempt.error = `Expected HTTP 402 and received ${probe.status}.`;
  }
} catch (error) {
  attempt.phase = "probe-failed";
  attempt.error = scrub(error instanceof Error ? error.message : error);
}

if (keyLoaded) {
  try {
    const account = privateKeyToAccount(key);
    attempt.address = account.address;
    const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
    const [wei, atomic] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      publicClient.readContract({
        address: usdc,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "balance", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [account.address],
      }),
    ]);
    attempt.balances = { eth: formatEther(wei), usdc: formatUnits(atomic, 6) };
  } catch (error) {
    attempt.balances = { eth: null, usdc: null, error: scrub(error instanceof Error ? error.message : error) };
  }
}

if (!keyLoaded) {
  attempt.phase = attempt.challenge ? "402-no-key" : attempt.phase;
  attempt.note = "No burner key loaded. The 402 challenge above is the unpaid quote. No receipt was created.";
} else if (attempt.httpStatus === 402) {
  try {
    const account = privateKeyToAccount(key);
    const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
    const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [
        {
          network,
          client: new ExactEvmScheme(toClientEvmSigner(account, publicClient)),
        },
      ],
      policies: [(_version, requirements) => requirements.filter((item) => item.scheme === "exact")],
      paymentRequirementsSelector: (_version, requirements) => {
        const exact = requirements.find((item) => item.scheme === "exact");
        if (!exact) throw new Error("The challenge has no exact scheme to sign.");
        return exact;
      },
      spendControls: {
        maxAmountPerPayment: "$0.05",
        allowedAssets: [
          {
            network,
            asset: usdc,
            maxAmountPerPayment: "50000",
          },
        ],
      },
    });
    const response = await paidFetch(`${engine}/v1/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body,
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text.slice(0, 800) };
    }
    attempt.httpStatus = response.status;
    const receiptHeader =
      response.headers.get("x-telegraph-receipt") ||
      response.headers.get("payment-response") ||
      response.headers.get("x-payment-response");
    const receipt = receiptHeader ? decodeBase64Json(receiptHeader) || { raw: receiptHeader.slice(0, 400) } : null;
    const signalHash = findSignalHash(parsed);
    if (response.ok && (receipt || signalHash)) {
      attempt.ok = true;
      attempt.paid = true;
      attempt.phase = "settled";
      attempt.signalHash = signalHash;
      attempt.signalUrl = signalHash ? `${engine}/v1/signal/${encodeURIComponent(signalHash)}` : null;
      attempt.receipt = receipt;
      attempt.costUsd = parsed && typeof parsed === "object" ? parsed.cost_usd ?? null : null;
      attempt.miner = parsed && typeof parsed === "object"
        ? { id: parsed.miner_id ?? null, name: parsed.miner_name ?? null, slug: parsed.miner_used ?? null }
        : null;
      attempt.result = parsed;
      attempt.note = "Settled on Sepolia with the exact scheme. The signal URL is the public check.";
      if (signalHash) {
        try {
          const signalResponse = await fetch(attempt.signalUrl);
          const signalText = await signalResponse.text();
          let signal = null;
          try {
            signal = signalText ? JSON.parse(signalText) : null;
          } catch {
            signal = { raw: signalText.slice(0, 800) };
          }
          const signalFile = path.join(evidenceDir, `signal-${signalHash.slice(2, 14)}.json`);
          fs.mkdirSync(evidenceDir, { recursive: true });
          fs.writeFileSync(
            signalFile,
            JSON.stringify({ hash: signalHash, url: attempt.signalUrl, status: signalResponse.status, signal, receipt }, null, 2),
          );
          attempt.signalFile = path.relative(root, signalFile);
        } catch (error) {
          attempt.signalError = scrub(error instanceof Error ? error.message : error);
        }
      }
    } else {
      attempt.phase = "payment-failed";
      attempt.paid = false;
      attempt.receipt = null;
      attempt.signalHash = null;
      attempt.error = scrub(`Paid ask returned ${response.status}. ${text}`);
      const signed = !String(attempt.error).includes("Failed to create payment payload");
      attempt.signed = signed;
      attempt.note = signed
        ? "The client signed an exact-scheme payload and the engine still returned 402. The burner holds 0 test USDC, so settlement cannot complete. This file is the 402 challenge plus that failed payment. It is not a receipt."
        : "Payment did not settle. The 402 challenge is real. This file is not a receipt.";
    }
  } catch (error) {
    attempt.phase = "payment-failed";
    attempt.paid = false;
    attempt.receipt = null;
    attempt.signed = false;
    attempt.error = scrub(error instanceof Error ? error.message : error);
    attempt.note =
      "The exact-scheme payment threw before a receipt existed. The earlier 402 challenge is real. This file is not a receipt.";
  }
}

const file = writeAttempt(attempt);
console.log(JSON.stringify({ file, ok: attempt.ok, phase: attempt.phase, httpStatus: attempt.httpStatus, error: attempt.error, address: attempt.address, balances: attempt.balances }, null, 2));
process.exit(attempt.phase === "probe-failed" ? 1 : 0);
