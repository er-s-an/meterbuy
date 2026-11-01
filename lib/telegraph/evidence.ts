import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { RunResult } from "@/lib/types";

const directory = () => path.join(process.cwd(), "docs", "evidence");

export type EvidenceIndexItem = {
  file: string;
  recordedAt: string;
  runId: string;
  preset: string;
  mode: string;
  settledUsd: number;
  headline: string;
  signalHashes: string[];
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function saveLiveRun(run: RunResult): string | null {
  const settled = run.calls.filter((call) => call.paid);
  if (settled.length === 0) return null;
  try {
    const dir = directory();
    fs.mkdirSync(dir, { recursive: true });
    const stamp = run.computedAt.replace(/[:.]/g, "-");
    const file = `live-${stamp}.json`;
    const payload = {
      recordedAt: run.computedAt,
      label: "Live Sepolia settlement. This file is a real engine response, not a mock.",
      runId: run.runId,
      preset: run.preset,
      mode: run.mode,
      settledUsd: run.settledUsd,
      task: run.task,
      calls: settled.map((call) => ({
        intent: call.intent,
        label: call.label,
        miner: call.miner,
        costUsd: call.settledUsd,
        durationMs: call.durationMs,
        signalHash: call.signalHash,
        signalUrl: call.signalUrl,
        receipt: call.receipt,
        signal: call.signal,
        intel: call.intel,
        raw: call.raw,
      })),
    };
    fs.writeFileSync(path.join(dir, file), JSON.stringify(payload, null, 2));
    const indexPath = path.join(dir, "history.json");
    const prior = readJson<EvidenceIndexItem[]>(indexPath) ?? [];
    const item: EvidenceIndexItem = {
      file,
      recordedAt: run.computedAt,
      runId: run.runId,
      preset: run.preset,
      mode: run.mode,
      settledUsd: run.settledUsd,
      headline: run.task.headline,
      signalHashes: settled.map((call) => call.signalHash).filter((hash): hash is string => Boolean(hash)),
    };
    fs.writeFileSync(indexPath, JSON.stringify([item, ...prior].slice(0, 40), null, 2));
    return file;
  } catch {
    return null;
  }
}

export function readEvidenceIndex(): EvidenceIndexItem[] {
  return readJson<EvidenceIndexItem[]>(path.join(directory(), "history.json")) ?? [];
}

export function readLastAttempt(): unknown {
  return readJson(path.join(directory(), "last-attempt.json"));
}
