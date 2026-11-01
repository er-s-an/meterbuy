import "server-only";

import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";

let loaded = false;

function readEnvFile(filePath: string) {
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

export function loadServerEnv() {
  if (loaded) return;
  loaded = true;
  const root = process.cwd();
  readEnvFile(path.join(root, ".env.local"));
  readEnvFile(path.join(root, ".env.burner.local"));
}

export function engineUrl() {
  loadServerEnv();
  return (process.env.TELEGRAPH_ENGINE_URL || "https://devnode.telegraphprotocol.com/engine").replace(
    /\/$/,
    "",
  );
}

export function nodeUrl() {
  loadServerEnv();
  return (process.env.TELEGRAPH_NODE_URL || "https://devnode.telegraphprotocol.com").replace(/\/$/, "");
}

export function rpcUrl() {
  loadServerEnv();
  return process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
}

export function usdcAddress() {
  loadServerEnv();
  return (process.env.USDC_SEPOLIA || "0xcc194e1a843B658526D0D5C431f670028582Ae17") as `0x${string}`;
}

export function networkId() {
  loadServerEnv();
  return process.env.EVM_NETWORK || "eip155:11155111";
}

export function privateKey(): `0x${string}` | null {
  loadServerEnv();
  const key = process.env.TELEGRAPH_EVM_PRIVATE_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return key as `0x${string}`;
}

export function burnerAccount() {
  const key = privateKey();
  if (!key) return null;
  try {
    return privateKeyToAccount(key);
  } catch {
    return null;
  }
}

export const QUOTE_USD = 0.01;
export const USDC_DECIMALS = 6;

export function signalUrl(hash: string) {
  return `${engineUrl()}/v1/signal/${encodeURIComponent(hash)}`;
}
