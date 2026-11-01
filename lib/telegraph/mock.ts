import { GATE_THRESHOLD } from "@/lib/tasks/outcomes";

const AI_PHRASES = [
  "as an ai",
  "in conclusion",
  "it's important to note",
  "it is important to note",
  "delve",
  "leverage",
  "tapestry",
  "in today's",
  "furthermore",
  "i'd be happy",
  "i would be happy",
  "robust",
  "landscape",
];

export function detectText(text: string): { verdict: string; aiLikelihood: number; cues: string[] } {
  const sample = text.trim();
  const lower = sample.toLowerCase();
  const cues: string[] = [];
  let score = 0.18;

  for (const phrase of AI_PHRASES) {
    if (lower.includes(phrase)) {
      score += 0.11;
      cues.push(phrase);
    }
  }

  const sentences = sample
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length >= 3) {
    const lengths = sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
    const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, length) => sum + (length - average) ** 2, 0) / lengths.length;
    if (variance < 10 && average > 10) {
      score += 0.22;
      cues.push("even sentence length");
    }
  }

  if (/\b(I|I'm|we|my)\b/.test(sample) && cues.length === 0) score -= 0.08;
  if (sample.length < 40) score -= 0.06;

  const aiLikelihood = Math.round(Math.min(0.98, Math.max(0.02, score)) * 1_000_000) / 1_000_000;
  let verdict = "Human";
  if (aiLikelihood >= 0.85) verdict = "AI-generated";
  else if (aiLikelihood >= GATE_THRESHOLD) verdict = "Likely AI-generated";
  else if (aiLikelihood >= 0.45) verdict = "Mixed";
  else if (aiLikelihood >= 0.28) verdict = "Likely human";

  return { verdict, aiLikelihood, cues };
}

export async function standInPrice(symbol: string): Promise<{ priceUsd: number; detail: string }> {
  const pair = `${symbol.toUpperCase()}-USD`;
  try {
    const response = await fetch(`https://api.coinbase.com/v2/prices/${encodeURIComponent(pair)}/spot`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      const body = (await response.json()) as { data?: { amount?: string } };
      const price = Number(body.data?.amount);
      if (Number.isFinite(price) && price > 0) {
        return { priceUsd: price, detail: "stand-in:coinbase-spot" };
      }
    }
  } catch {
    // Fall through to a deterministic stand-in that still changes with the symbol.
  }

  let hash = 2166136261;
  const key = symbol.toUpperCase();
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  const priceUsd = Math.round(((Math.abs(hash) % 50_000) / 100 + 0.5) * 100) / 100;
  return { priceUsd, detail: "stand-in:symbol-table" };
}

const STAND_IN_HEADERS = {
  accept: "application/json",
  "user-agent": "MeterBuy/1.0 (personal desk demo)",
};

export async function standInSearch(query: string): Promise<{ answer: string | null; sources: string[]; detail: string }> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
    const searchResponse = await fetch(searchUrl, {
      cache: "no-store",
      headers: STAND_IN_HEADERS,
    });
    if (searchResponse.ok) {
      const payload = (await searchResponse.json()) as [string, string[], string[], string[]];
      const title = payload?.[1]?.[0];
      const description = payload?.[2]?.[0];
      const link = payload?.[3]?.[0];
      if (title) {
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryResponse = await fetch(summaryUrl, {
          cache: "no-store",
          headers: STAND_IN_HEADERS,
        });
        if (summaryResponse.ok) {
          const summary = (await summaryResponse.json()) as {
            extract?: string;
            content_urls?: { desktop?: { page?: string } };
          };
          const page = summary.content_urls?.desktop?.page || link;
          if (summary.extract) {
            return {
              answer: summary.extract,
              sources: page ? [page] : [],
              detail: "stand-in:wikipedia",
            };
          }
        }
        if (description) {
          return {
            answer: description,
            sources: link ? [link] : [],
            detail: "stand-in:wikipedia",
          };
        }
      }
    }
  } catch {
    // Try the instant-answer stand-in below.
  }

  try {
    const duckUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const duckResponse = await fetch(duckUrl, { cache: "no-store", headers: STAND_IN_HEADERS });
    if (duckResponse.ok) {
      const duck = (await duckResponse.json()) as {
        Abstract?: string;
        AbstractURL?: string;
        RelatedTopics?: { Text?: string; FirstURL?: string }[];
      };
      const related = (duck.RelatedTopics || []).find((topic) => topic.Text && topic.FirstURL);
      const answer = duck.Abstract?.trim() || related?.Text || null;
      const source = duck.AbstractURL || related?.FirstURL;
      if (answer) {
        return {
          answer,
          sources: source ? [source] : [],
          detail: "stand-in:duckduckgo",
        };
      }
    }
  } catch {
    // No stand-in page answered. The desk withholds the note.
  }

  return {
    answer: null,
    sources: [],
    detail: "stand-in:none",
  };
}
