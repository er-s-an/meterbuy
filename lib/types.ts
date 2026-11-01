export type Preset = "briefing" | "gate" | "intel";
export type RequestedMode = "live" | "mock";
export type ResultMode = "live" | "mock" | "mixed";

export type MinerPick = {
  id: string | null;
  name: string | null;
  slug: string | null;
  rank: number | null;
  score: number | null;
  selection: "engine-response" | "public-leaderboard" | "unknown";
};

export type ChallengeView = {
  scheme: string;
  network: string;
  amountAtomic: string;
  amountUsd: number;
  asset: string;
  payTo: string;
};

export type CallRecord = {
  intent: string;
  label: string;
  paid: boolean;
  source: "telegraph" | "stand-in" | "unreadable";
  sourceDetail: string;
  fallbackReason: string | null;
  miner: MinerPick;
  quotedUsd: number | null;
  settledUsd: number | null;
  durationMs: number | null;
  signalHash: string | null;
  signalUrl: string | null;
  signal: unknown | null;
  receipt: unknown | null;
  challenge: ChallengeView | null;
  intel: Record<string, unknown> | null;
  raw: unknown | null;
};

export type SkippedCall = {
  label: string;
  reason: string;
};

export type PriceRow = {
  symbol: string;
  priceUsd: number;
  dollars: number;
  units: number;
};

export type TaskView = {
  headline: string;
  outcome: string;
  recommendation: string;
  decision: "SEND" | "HOLD" | null;
  lines: string[];
  dependsOn: string[];
  rows: PriceRow[];
};

export type WalletView = {
  address: string | null;
  eth: string;
  usdc: string;
  canPay: boolean;
  note: string;
};

export type RunResult = {
  runId: string;
  computedAt: string;
  preset: Preset;
  requestedMode: RequestedMode;
  mode: ResultMode;
  modeReason: string;
  paid: boolean;
  budgetUsd: number;
  settledUsd: number;
  quotedUsd: number;
  wallet: WalletView;
  calls: CallRecord[];
  skipped: SkippedCall[];
  task: TaskView;
};

export type JobCatalog = {
  id: Preset;
  intent: string;
  title: string;
  blurb: string;
  miner: MinerPick;
  listed: number;
};

export type PublicCatalog = {
  engine: string;
  reachable: boolean;
  epoch: number | null;
  intentCount: number | null;
  quoteUsd: number;
  wallet: WalletView;
  jobs: JobCatalog[];
};
