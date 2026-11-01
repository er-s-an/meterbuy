"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { briefingFromPrices, formatUnits, formatUsd } from "@/lib/tasks/outcomes";
import type { CallRecord, Preset, RequestedMode, RunResult } from "@/lib/types";

type StatusPayload = {
  wallet?: {
    address?: string | null;
    eth?: string;
    usdc?: string;
    canPay?: boolean;
    note?: string;
  };
  engine?: { reachable?: boolean; intentCount?: number | null };
  keyLoaded?: boolean;
  defaultMode?: RequestedMode;
  quoteUsd?: number;
  evidence?: { file: string; recordedAt: string; headline: string; mode: string; signalHashes: string[] }[];
  lastAttempt?: {
    at?: string | null;
    ok?: boolean;
    paid?: boolean;
    phase?: string | null;
    httpStatus?: number | null;
    signalHash?: string | null;
    error?: string | null;
    note?: string | null;
  } | null;
};

type SessionRun = {
  result: RunResult;
  symbols: string;
  text: string;
  query: string;
  budget: string;
  purse: string;
};

const HUMAN_DRAFT =
  "Met the landlord at eight. The sink still leaks, so I told him I will call again Thursday if it is not fixed.";
const AI_DRAFT =
  "In today's rapidly evolving landscape, it is important to note that teams must leverage a robust tapestry of solutions. Furthermore, I would be happy to delve into the next steps.";

const STORAGE_KEY = "meterbuy.session.v1";

export function Desk({
  initialPreset = "briefing",
  initialSymbol = "",
  initialMode = "live",
}: {
  initialPreset?: string;
  initialSymbol?: string;
  initialMode?: string;
}) {
  const baseId = useId();
  const outcomeRef = useRef<HTMLHeadingElement>(null);
  const [preset, setPreset] = useState<Preset>(parsePreset(initialPreset));
  const [symbols, setSymbols] = useState(initialSymbol.trim() || "BTC, ETH");
  const [text, setText] = useState(HUMAN_DRAFT);
  const [query, setQuery] = useState("Ethereum");
  const [budget, setBudget] = useState("0.05");
  const [purse, setPurse] = useState("100");
  const [mode, setMode] = useState<RequestedMode>(initialMode === "mock" ? "mock" : "live");
  const [modeReady, setModeReady] = useState(false);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionRun | null>(null);
  const [history, setHistory] = useState<SessionRun[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/telegraph/status", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((data: StatusPayload) => {
        setStatus(data);
        setMode(data.defaultMode === "mock" || initialMode === "mock" ? "mock" : "live");
        setModeReady(true);
      })
      .catch(() => setModeReady(true));
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SessionRun[];
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 8));
      }
    } catch {
      // A private window can refuse storage. The desk still runs.
    }
    return () => controller.abort();
  }, [initialMode]);

  useEffect(() => {
    if (!session) return;
    outcomeRef.current?.focus();
  }, [session]);

  const quote = status?.quoteUsd ?? 0.01;
  const symbolCount = symbols.split(/[^A-Za-z0-9]+/).filter((item) => /^[A-Za-z0-9]{1,12}$/.test(item)).length;
  const expectedCalls = preset === "briefing" ? Math.max(symbolCount, 1) : 1;
  const estimate = Math.round(expectedCalls * quote * 100) / 100;
  const wallet = status?.wallet;
  const liveWillFallback = mode === "live" && wallet && wallet.canPay === false;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      preset,
      mode,
      budgetUsd: Number(budget),
      purseUsd: Number(purse),
      symbols,
      text,
      query,
    };
    try {
      const response = await fetch("/api/telegraph/ask", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await response.json()) as RunResult & { error?: string };
      if (!response.ok) {
        setError(data.error || "The desk could not run.");
        return;
      }
      const next: SessionRun = { result: data, symbols, text, query, budget, purse };
      setSession(next);
      setHistory((current) => {
        const following = [next, ...current].slice(0, 8);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(following));
        } catch {
          // Ignore storage failures.
        }
        return following;
      });
    } catch {
      setError("The desk did not answer. Check the server, then run again.");
    } finally {
      setBusy(false);
    }
  }

  function restore(item: SessionRun) {
    setPreset(item.result.preset);
    setSymbols(item.symbols);
    setText(item.text);
    setQuery(item.query);
    setBudget(item.budget);
    setPurse(item.purse);
    setMode(item.result.requestedMode);
    setSession(item);
  }

  const result = session?.result ?? null;
  const purseNumber = Number(purse);
  const resized =
    result?.preset === "briefing"
      ? briefingFromPrices(
          result.calls.map((call) => ({
            symbol: call.label,
            priceUsd: typeof call.intel?.price_usd === "number" ? call.intel.price_usd : null,
            source: call.sourceDetail,
          })),
          Number.isFinite(purseNumber) ? purseNumber : 100,
        )
      : null;
  const task = result
    ? resized
      ? {
          ...result.task,
          headline: resized.headline,
          outcome: resized.outcome,
          recommendation: resized.recommendation,
          lines: resized.lines,
          dependsOn: resized.dependsOn,
          rows: resized.basket,
        }
      : result.task
    : null;
  const purseMoved = result?.preset === "briefing" && purse !== session?.purse;

  return (
    <section className="desk-wrap" id="desk">
      <div className="desk">
        <div className="desk-head">
          <h2>The desk</h2>
          <p>
            Change the inputs and run again. Each run asks the engine, or builds a labeled stand-in when
            payment cannot settle. Nothing in Mock is presented as an on-chain receipt.
          </p>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          <fieldset className="panel">
            <legend>Job</legend>
            <Choice
              name="preset"
              value="briefing"
              current={preset}
              onChange={setPreset}
              title="Crypto briefing"
              detail="Buy a USD price for each symbol, then rank them."
            />
            <Choice
              name="preset"
              value="gate"
              current={preset}
              onChange={setPreset}
              title="Fraud gate"
              detail="Buy an AI-text verdict, then send or hold."
            />
            <Choice
              name="preset"
              value="intel"
              current={preset}
              onChange={setPreset}
              title="Web intel"
              detail="Buy a search answer, then write the next step."
            />
          </fieldset>

          <div className="panel">
            {preset === "briefing" ? (
              <label>
                Symbols
                <input
                  id={`${baseId}-symbols`}
                  value={symbols}
                  onChange={(event) => setSymbols(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={`${baseId}-symbols-hint`}
                />
                <span className="hint" id={`${baseId}-symbols-hint`}>
                  Up to six tickers. {symbolCount || 0} will be asked. About {formatUsd(estimate)} at the public quote, still inside the cap.
                </span>
              </label>
            ) : null}
            {preset === "gate" ? (
              <label>
                Draft
                <textarea value={text} onChange={(event) => setText(event.target.value)} />
                <span className="samples">
                  <button type="button" className="text-button" onClick={() => setText(HUMAN_DRAFT)}>
                    Load a plain note
                  </button>
                  <button type="button" className="text-button" onClick={() => setText(AI_DRAFT)}>
                    Load a stiff draft
                  </button>
                </span>
              </label>
            ) : null}
            {preset === "intel" ? (
              <label>
                Query
                <input value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
              </label>
            ) : null}
          </div>

          <div className="panel">
            <div className="row-2">
              <label>
                Max spend, USD
                <input
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label>
                Basket, USD
                <input
                  type="number"
                  min={10}
                  max={10000}
                  step={10}
                  value={purse}
                  onChange={(event) => setPurse(event.target.value)}
                  inputMode="decimal"
                  disabled={preset !== "briefing"}
                />
              </label>
            </div>
            <p className="hint">The cap limits Telegraph spend. The basket only sizes the briefing.</p>
          </div>

          <fieldset className="panel">
            <legend>Settlement</legend>
            <Choice
              name="mode"
              value="live"
              current={mode}
              onChange={setMode}
              title="Live"
              detail="Sign the exact scheme on Sepolia when the burner can pay."
            />
            <Choice
              name="mode"
              value="mock"
              current={mode}
              onChange={setMode}
              title="Mock"
              detail="Do not sign. Show a stand-in and leave the receipt blank."
            />
            <p className="hint">{walletNote(wallet, modeReady)}</p>
            {liveWillFallback ? (
              <p className="banner warn" role="status">
                Live is selected, and this burner cannot pay. The run will fall back to Mock and will not print a receipt.
              </p>
            ) : null}
          </fieldset>

          <button className="run" type="submit" disabled={busy}>
            {busy ? "Asking the engine…" : "Run the desk"}
          </button>
          {error ? (
            <p className="banner warn" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <div className="stack" aria-live="polite">
          {!result || !task ? (
            <div className="panel">
              <h3 className="display" style={{ fontSize: "2rem" }}>
                No run yet
              </h3>
              <p className="body" style={{ marginTop: "0.7rem" }}>
                The panel stays empty until you run the desk. An empty panel is not a receipt, and a sample slip on the first screen is not one either.
              </p>
            </div>
          ) : (
            <article className="panel outcome">
              <p className="hint">
                {result.mode === "live"
                  ? "Live Sepolia settlement."
                  : result.mode === "mixed"
                    ? "Mixed. Only paid rows carry a receipt."
                    : "Mock. No receipt was issued."}
              </p>
              <h3 ref={outcomeRef} tabIndex={-1}>
                {task.headline}
              </h3>
              {task.decision ? <p className={`decision ${task.decision === "HOLD" ? "hold" : "send"}`}>{task.decision}</p> : null}
              <p className="body">{task.outcome}</p>
              <p className="recommend">{task.recommendation}</p>
              {purseMoved ? (
                <p className="hint">Resized from the prices already in this run. The quotes were not bought again. Run the desk to buy fresh ones.</p>
              ) : null}
              {result.requestedMode === "live" && result.mode !== "live" ? (
                <p className="banner warn" role="status">
                  {result.modeReason}
                </p>
              ) : (
                <p className="hint">{result.modeReason}</p>
              )}
              <p className="hint">
                Spent {formatUsd(result.settledUsd)} of a {formatUsd(result.budgetUsd)} cap. Quoted {formatUsd(result.quotedUsd)}. Run {result.runId.slice(0, 8)} at {result.computedAt}.
              </p>
              {task.rows.length > 0 ? (
                <table>
                  <caption>Price table from this run</caption>
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Symbol</th>
                      <th scope="col">Price</th>
                      <th scope="col">Dollars</th>
                      <th scope="col">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task.rows.map((row, index) => (
                      <tr key={row.symbol}>
                        <td>{index + 1}</td>
                        <td>{row.symbol}</td>
                        <td>{formatUsd(row.priceUsd)}</td>
                        <td>{formatUsd(row.dollars)}</td>
                        <td>{formatUnits(row.units)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {task.lines.length > 0 ? (
                <ul>
                  {task.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {task.dependsOn.length > 0 ? (
                <p className="hint">Depends on {task.dependsOn.join("; ")}.</p>
              ) : (
                <p className="hint">This outcome does not depend on a readable answer.</p>
              )}
            </article>
          )}

          {result?.calls.map((call, index) => (
            <CallCard key={`${result.runId}-${call.label}-${index}`} call={call} />
          ))}

          {result && result.skipped.length > 0 ? (
            <div className="panel">
              <h3 className="display" style={{ fontSize: "1.6rem" }}>
                Not sent
              </h3>
              <ul>
                {result.skipped.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {history.length > 0 ? (
            <div className="panel">
              <h3 className="display" style={{ fontSize: "1.6rem" }}>
                This browser
              </h3>
              <div className="history">
                {history.map((item) => (
                  <button type="button" key={item.result.runId} onClick={() => restore(item)}>
                    <span className={`tag ${item.result.mode}`}>{item.result.mode}</span>
                    {item.result.task.headline}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <ProofStrip status={status} />
        </div>
      </div>
    </section>
  );
}

function parsePreset(value: string): Preset {
  if (value === "gate" || value === "intel" || value === "briefing") return value;
  return "briefing";
}

function Choice<T extends string>({
  name,
  value,
  current,
  onChange,
  title,
  detail,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (value: T) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="choice">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(value)} />
      <span>
        <strong>{title}</strong>
        <span className="hint" style={{ display: "block" }}>
          {detail}
        </span>
      </span>
    </label>
  );
}

function CallCard({ call }: { call: CallRecord }) {
  return (
    <article className="call">
      <h4>
        {call.label} · {call.intent}
      </h4>
      <p>
        <span className={`tag ${call.paid ? "live" : "mock"}`}>{call.paid ? "Paid" : "Not paid"}</span>
        {call.source === "telegraph" ? "Engine intel" : call.source === "stand-in" ? "Stand-in intel" : "Unreadable"}
      </p>
      {call.fallbackReason ? <p className="hint">{call.fallbackReason}</p> : null}
      <dl className="meta">
        <dt>Miner</dt>
        <dd>
          {call.miner.name || "Unknown"} {call.miner.id ? `· id ${call.miner.id}` : ""}
          {call.miner.rank != null ? ` · board rank ${call.miner.rank}` : ""}
          <span className="hint" style={{ display: "block" }}>
            {call.miner.selection === "engine-response"
              ? "Name taken from the engine response."
              : call.miner.selection === "public-leaderboard"
                ? "Board leader for context. This row did not claim that miner was paid."
                : "No miner id came back."}
          </span>
        </dd>
        <dt>Cost</dt>
        <dd>{call.paid ? formatUsd(call.settledUsd || 0) : `${formatUsd(0)} settled`}</dd>
        <dt>Quote</dt>
        <dd>{call.quotedUsd != null ? formatUsd(call.quotedUsd) : "No quote"}</dd>
        <dt>Duration</dt>
        <dd>{call.durationMs != null ? `${call.durationMs} ms` : "Not reported"}</dd>
        <dt>Signal</dt>
        <dd>
          {call.paid && call.signalHash && call.signalUrl ? (
            <a className="hash" href={call.signalUrl} target="_blank" rel="noreferrer">
              {call.signalHash}
            </a>
          ) : (
            "No signal hash. This row was not settled."
          )}
        </dd>
      </dl>
      {call.challenge ? (
        <p className="hint">
          402 quote, not a receipt: {call.challenge.scheme} on {call.challenge.network} for {formatUsd(call.challenge.amountUsd)} to {shortAddress(call.challenge.payTo)}.
        </p>
      ) : null}
      <details>
        <summary>Shaped intel</summary>
        <pre>
          <code>{JSON.stringify(call.intel, null, 2)}</code>
        </pre>
      </details>
      <details>
        <summary>Raw engine body</summary>
        {call.raw ? (
          <pre>
            <code>{JSON.stringify(call.raw, null, 2)}</code>
          </pre>
        ) : (
          <p className="hint">No raw engine body. This row did not settle, so there is nothing to decode.</p>
        )}
      </details>
      <details>
        <summary>Decoded receipt</summary>
        {call.paid && call.receipt ? (
          <pre>
            <code>{JSON.stringify(call.receipt, null, 2)}</code>
          </pre>
        ) : (
          <p className="hint">No receipt. Mock rows and failed payments do not invent one.</p>
        )}
      </details>
      {call.paid && call.signal ? (
        <details>
          <summary>Signal record</summary>
          <pre>
            <code>{JSON.stringify(call.signal, null, 2)}</code>
          </pre>
        </details>
      ) : null}
    </article>
  );
}

function ProofStrip({ status }: { status: StatusPayload | null }) {
  const attempt = status?.lastAttempt;
  return (
    <div className="panel">
      <h3 className="display" style={{ fontSize: "1.6rem" }}>
        Smoke on this server
      </h3>
      {!attempt ? (
        <p className="hint">No smoke file has been read yet. Run scripts/smoke-ask.mjs and refresh.</p>
      ) : attempt.paid && attempt.signalHash ? (
        <p>
          <span className="tag live">Live</span>
          Last smoke settled. Signal {attempt.signalHash}.
        </p>
      ) : (
        <p>
          <span className="tag mock">Not a receipt</span>
          Last smoke phase: {attempt.phase || "unknown"}.
          {attempt.httpStatus ? ` HTTP ${attempt.httpStatus}.` : ""} {attempt.note || attempt.error || "Payment did not settle."}
        </p>
      )}
      {status?.evidence && status.evidence.length > 0 ? (
        <ul>
          {status.evidence.slice(0, 5).map((item) => (
            <li key={item.file}>
              {item.file}: {item.headline} ({item.mode})
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No saved live receipt file on this server.</p>
      )}
    </div>
  );
}

function walletNote(
  wallet: StatusPayload["wallet"] | undefined,
  ready: boolean,
): string {
  if (!ready) return "Reading the burner…";
  if (!wallet?.address) return "No burner key is loaded. Live settlement is off.";
  const short = shortAddress(wallet.address);
  return `${short} holds ${wallet.eth} ETH and ${wallet.usdc} test USDC. ${wallet.note || ""}`;
}

function shortAddress(value: string): string {
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
