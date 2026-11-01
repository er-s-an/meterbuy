export const GATE_THRESHOLD = 0.62;
export const BASKET_USD = 100;

export type PricePoint = {
  symbol: string;
  priceUsd: number | null;
  source: string;
};

export type BriefingTask = {
  headline: string;
  outcome: string;
  recommendation: string;
  lines: string[];
  dependsOn: string[];
  basket: { symbol: string; priceUsd: number; dollars: number; units: number }[];
};

export function formatUsd(value: number): string {
  const digits = value >= 1 ? 2 : 6;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatUnits(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export function briefingFromPrices(points: PricePoint[], purseUsd = BASKET_USD): BriefingTask {
  const usable = points.filter(
    (point): point is PricePoint & { priceUsd: number } =>
      point.priceUsd != null && Number.isFinite(point.priceUsd) && point.priceUsd > 0,
  );

  if (usable.length === 0) {
    return {
      headline: "Briefing incomplete",
      outcome: "No usable unit price came back, so the desk sized nothing.",
      recommendation: "Buy the quotes again. A rank needs at least one price.",
      lines: points.map((point) => `${point.symbol}: no price`),
      dependsOn: [],
      basket: [],
    };
  }

  const ranked = [...usable].sort((a, b) => b.priceUsd - a.priceUsd);
  const share = purseUsd / usable.length;
  const basket = usable.map((point) => ({
    symbol: point.symbol,
    priceUsd: point.priceUsd,
    dollars: share,
    units: share / point.priceUsd,
  }));
  const leader = ranked[0];
  const deepest = [...basket].sort((a, b) => b.units - a.units)[0];

  return {
    headline: `${leader.symbol} leads the quote board at ${formatUsd(leader.priceUsd)}`,
    outcome: `Ranked ${usable.length} symbol${usable.length === 1 ? "" : "s"} by the unit price just bought. A ${formatUsd(purseUsd)} purse is split into equal dollars. This is a briefing, not an order, and it does not invent a 24-hour move.`,
    recommendation: `Put attention on ${deepest.symbol}. The same ${formatUsd(share)} slice buys ${formatUnits(deepest.units)} units there, more than any other name in this run.`,
    lines: basket
      .slice()
      .sort((a, b) => b.priceUsd - a.priceUsd)
      .map(
        (row, index) =>
          `${index + 1}. ${row.symbol} at ${formatUsd(row.priceUsd)} buys ${formatUnits(row.units)} units for ${formatUsd(row.dollars)}`,
      ),
    dependsOn: usable.map((point) => `${point.symbol} price from ${point.source}`),
    basket,
  };
}

const AI_VERDICTS = new Set(["AI-generated", "Likely AI-generated"]);

export function gateFromDetection(input: {
  verdict: string | null;
  aiLikelihood: number | null;
  cues: string[];
  source: string;
}): {
  decision: "SEND" | "HOLD";
  headline: string;
  outcome: string;
  recommendation: string;
  lines: string[];
  dependsOn: string[];
} {
  if (input.verdict == null && input.aiLikelihood == null) {
    return {
      decision: "HOLD",
      headline: "Hold",
      outcome: "The intel was unreadable, so the desk holds the message.",
      recommendation: "Do not send. Buy a readable verdict before this draft leaves the desk.",
      lines: ["No verdict and no likelihood."],
      dependsOn: [],
    };
  }

  const hotVerdict = input.verdict != null && AI_VERDICTS.has(input.verdict);
  const hotScore = input.aiLikelihood != null && input.aiLikelihood >= GATE_THRESHOLD;
  const decision = hotVerdict || hotScore ? "HOLD" : "SEND";
  const likelihood =
    input.aiLikelihood == null ? "no likelihood" : input.aiLikelihood.toFixed(2);
  const verdict = input.verdict ?? "no verdict";
  const rule = `Desk rule: hold when the verdict is AI-generated or likely AI-generated, or when likelihood is at least ${GATE_THRESHOLD.toFixed(2)}.`;

  return {
    decision,
    headline: decision === "HOLD" ? "Hold the draft" : "Send the draft",
    outcome:
      decision === "HOLD"
        ? `Hold. The bought verdict is ${verdict}, likelihood ${likelihood}. ${rule}`
        : `Send. The bought verdict is ${verdict}, likelihood ${likelihood}. ${rule}`,
    recommendation:
      decision === "HOLD"
        ? "Keep the draft on the desk. Rewrite the lines the cues name, then buy the check again."
        : "The gate cleared this draft. Send it, and keep the verdict next to the message.",
    lines: input.cues.length > 0 ? input.cues.map((cue) => `Cue: ${cue}`) : ["No named cues."],
    dependsOn: [`verdict and likelihood from ${input.source}`],
  };
}

export function noteFromSearch(input: {
  query: string;
  answer: string | null;
  sources: string[];
  source: string;
}): {
  headline: string;
  outcome: string;
  recommendation: string;
  lines: string[];
  dependsOn: string[];
} {
  if (!input.answer) {
    return {
      headline: "Note withheld",
      outcome: `Nothing readable came back for “${input.query}”.`,
      recommendation: "Rewrite the query as a named thing plus a year, then run the desk again.",
      lines: ["The search did not return an answer the desk can act on."],
      dependsOn: [],
    };
  }

  const next = input.sources[0]
    ? `Open ${input.sources[0]} and copy one dated figure before you forward this.`
    : "The answer named no source. Ask for a source before you forward it.";

  return {
    headline: "Note ready",
    outcome: input.answer,
    recommendation: next,
    lines: input.sources.slice(0, 3).map((source) => `Source: ${source}`),
    dependsOn: [`answer from ${input.source}`],
  };
}
