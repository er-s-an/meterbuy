"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { PublicCatalog } from "@/lib/types";

const ROWS = [
  { id: "briefing", kind: "Briefing", place: "Crypto price", value: "Symbols you type", href: "/sandbox?preset=briefing" },
  { id: "gate", kind: "Gate", place: "AI text", value: "Send or hold", href: "/sandbox?preset=gate" },
  { id: "intel", kind: "Intel", place: "Web search", value: "A note you can use", href: "/sandbox?preset=intel" },
  { id: "cap", kind: "Cap", place: "Your budget", value: "Stops the next buy", href: "/sandbox" },
  { id: "proof", kind: "Proof", place: "The receipt", value: "Only after settlement", href: "#proof" },
] as const;

export function HomePage({ catalog }: { catalog: PublicCatalog }) {
  const briefing = catalog.jobs.find((job) => job.id === "briefing");
  const [symbol, setSymbol] = useState("BTC");
  const [active, setActive] = useState("photo");
  const clean = useMemo(() => {
    const next = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    return next || "BTC";
  }, [symbol]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.16 },
    );
    for (const node of nodes) observer.observe(node);
    const failsafe = window.setTimeout(() => {
      for (const node of nodes) node.classList.add("in");
    }, 2200);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  const miner = briefing?.miner.name || "the top miner";
  const rank = briefing?.miner.rank ?? "—";

  return (
    <main id="content">
      <section className="hero">
        <div className="hero-nav">
          <a className="word" href="#content">
            MeterBuy
          </a>
          <a className="desk-link" href="/sandbox">
            Open the desk
          </a>
        </div>
        <div className="hero-copy">
          <h1 data-reveal>Buy a fact.</h1>
          <p className="support" data-reveal style={{ ["--d" as string]: "80ms" }}>
            A personal desk pays one ranked miner, then uses the answer.
          </p>
        </div>
        <div className="folder-stack">
          <a className="folder" style={folderStyle(0, "#c8c8c8", "6%", "0ms")} href="#cap" data-reveal>
            <span className="tab">Budget</span>
            <span className="strip" />
          </a>
          <a className="folder" style={folderStyle(1, "#bdbdbd", "28%", "70ms")} href="#proof" data-reveal>
            <span className="tab">Receipt</span>
            <span className="strip" />
          </a>
          <a className="folder" style={folderStyle(2, "#b0b0b0", "50%", "140ms")} href="/sandbox?preset=intel" data-reveal>
            <span className="tab">Intel</span>
            <span className="strip" />
          </a>
          <a className="folder" style={folderStyle(3, "#a3a3a3", "70%", "210ms")} href="/sandbox?preset=gate" data-reveal>
            <span className="tab">Gate</span>
            <span className="strip" />
          </a>
          <div className="folder front" data-reveal style={{ ["--d" as string]: "280ms" }}>
            <span className="tab" style={{ ["--tab" as string]: "8%" }}>
              Briefing
            </span>
            <form className="ticket" data-ui action="/sandbox" method="get">
              <input type="hidden" name="preset" value="briefing" />
              <p>The ticket reprints as you type. One cent, one symbol, the miner who ranks first.</p>
              <label>
                Symbol
                <input
                  className="field"
                  name="symbol"
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  aria-label="Symbol"
                  autoCapitalize="characters"
                />
              </label>
              <p className="ticket-line">
                {clean} · CRYPTO_PRICE_USD · $0.01 · {miner} · rank {rank}
              </p>
              <button className="btn light" type="submit">
                Open this ticket
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="statement-wrap" data-reveal>
        <p className="statement">
          You skip the miner
          <img className="thumb" src="/atmosphere/ridge.jpg" alt="" />
          stack. You set a cap, buy the next fact from whoever ranks first, and keep that fact tied to the decision
          <img className="thumb" src="/atmosphere/night.jpg" alt="" />.
        </p>
      </section>

      <div className="photo-band" data-reveal>
        <img
          src="/atmosphere/night.jpg"
          alt="A person standing under the Milky Way, photographed by Greg Rakozy"
          width={1600}
          height={1000}
        />
      </div>

      <section className="section how" id="how">
        <h2 data-reveal>From quote to decision</h2>
        <div className="bar" data-ui data-reveal style={{ ["--d" as string]: "90ms" }}>
          <div className="seg" style={{ ["--c" as string]: "#d6d6d6", ["--on" as string]: "#7d0c14", ["--grow" as string]: 1 }}>
            <strong>A moment</strong>
            <span>The engine names the price before anything is signed.</span>
          </div>
          <div className="seg" style={{ ["--c" as string]: "#7d0c14", ["--on" as string]: "#e2e2e2", ["--grow" as string]: 1.2 }}>
            <strong>One signature</strong>
            <span>Sepolia test USDC, or the desk stops and says so.</span>
          </div>
          <div className="seg" style={{ ["--c" as string]: "#5c090f", ["--on" as string]: "#e2e2e2", ["--grow" as string]: 3 }}>
            <strong>The miner</strong>
            <span>Ranked supply returns the fact. The rank is public before you pay.</span>
          </div>
          <div className="seg" style={{ ["--c" as string]: "#c8c8c8", ["--on" as string]: "#7d0c14", ["--grow" as string]: 2 }}>
            <strong>Your call</strong>
            <span>The briefing, the gate, or the note changes with that fact.</span>
          </div>
        </div>
      </section>

      <section className="section jobs" id="jobs">
        <h2 data-reveal>What the desk buys</h2>
        <div className="jobs-grid">
          <div
            className="preview"
            data-reveal
            onMouseLeave={() => setActive("photo")}
          >
            <div className={active === "photo" ? "frame on" : "frame"}>
              <img
                src="/atmosphere/ridge.jpg"
                alt="A ridge under a twilight sky, photographed by lee Scott"
                width={900}
                height={1125}
              />
            </div>
            <div className={active === "briefing" ? "frame on fragment" : "frame fragment"} data-ui>
              <b>{briefing?.miner.name || "Top miner"}</b>
              <span>CRYPTO_PRICE_USD · rank {String(rank)}</span>
              <span>The unit price prints on the desk, then the basket is sized from it.</span>
            </div>
            <div className={active === "gate" ? "frame on fragment" : "frame fragment"} data-ui>
              <b>Send or hold</b>
              <span>Likelihood at 0.62, or an AI-leaning verdict, holds the message.</span>
            </div>
            <div className={active === "intel" ? "frame on fragment" : "frame fragment"} data-ui>
              <b>A note</b>
              <span>The answer stays attached to the page you should open next.</span>
            </div>
            <div className={active === "cap" ? "frame on fragment" : "frame fragment"} data-ui>
              <b>$0.01 a call</b>
              <span>The cap drops the next symbol instead of spending past it.</span>
            </div>
            <div className={active === "proof" ? "frame on fragment" : "frame fragment"} data-ui>
              <b>No receipt yet</b>
              <span>A receipt appears only after a settled exact payment.</span>
            </div>
          </div>
          <div data-reveal style={{ ["--d" as string]: "80ms" }}>
            <div className="table-name">Jobs</div>
            {ROWS.map((row) => (
              <a
                key={row.id}
                className={active === row.id ? "job-row active" : "job-row"}
                href={row.href}
                onMouseEnter={() => setActive(row.id)}
                onFocus={() => setActive(row.id)}
              >
                <em>{row.kind}</em>
                <span>{row.place}</span>
                <span>{row.value}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section proof" id="proof">
        <div className="tiles">
          <div className="tile head" data-reveal>
            <h2>On the testnet</h2>
          </div>
          <Tile title={catalog.intentCount ? `${catalog.intentCount} intents` : "Intent catalog"} detail={catalog.reachable ? "Read live from the engine." : "The engine did not answer just now."} />
          <Tile title="One cent" detail="The unpaid challenge quotes 10,000 µUSDC." />
          <Tile title="Sepolia" detail="Exact payments use eip155:11155111." />
          <Tile title="Mission 09" detail="A personal agent buys ranked supply." />
          <Tile title="Exact scheme" detail="Escrow is offered. The desk signs exact only." />
          <Tile title={catalog.epoch ? `Epoch ${catalog.epoch}` : "Ranked miners"} detail="Leaderboard rank is public before you pay." />
        </div>
      </section>

      <section className="plans" id="cap">
        <article className="plan main">
          <div>
            <h2 data-reveal>The desk</h2>
            <p className="who">For a person who wants the answer and does not want to run a miner.</p>
          </div>
          <p className="includes">
            Three jobs, a cap you set, and a receipt when the chain settles. If the burner cannot pay, the same desk
            runs in Mock and leaves the receipt blank.
          </p>
          <div className="plan-foot">
            <div className="price">
              $0.01<small>per call</small>
            </div>
            <a className="btn light" href="/sandbox">
              Open the desk
            </a>
          </div>
        </article>
        <article className="plan alt">
          <div>
            <h2 data-reveal>The quote</h2>
            <p className="who">For a check of the rail before any signature leaves the server.</p>
          </div>
          <p className="includes">
            Every run records the live 402 challenge: price, network, asset, and payee. That challenge is not a receipt
            and it does not spend test USDC.
          </p>
          <div className="plan-foot">
            <div className="price">
              $0<small>to look</small>
            </div>
            <a className="btn" href="/sandbox?preset=briefing&mode=mock">
              Read a quote
            </a>
          </div>
        </article>
      </section>

      <a className="cta" href="/sandbox">
        <p className="next">The desk recomputes when you change the inputs.</p>
        <svg className="arrow" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M8 40 L40 8 M18 8 H40 V30" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
        <div className="verb">Open</div>
      </a>

      <footer className="footer">
        <div className="mark" aria-hidden="true">
          {"METERBUY".split("").map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </div>
        <div className="foot-grid">
          <div>
            <a href="/sandbox">Desk</a>
            <a href="#jobs">Jobs</a>
            <a href="#how">How a buy works</a>
          </div>
          <div>
            <a href="#proof">Testnet facts</a>
            <a href="#cap">Price</a>
            <a href="https://docs.telegraphprotocol.com/docs/using/engine-ask">Engine docs</a>
          </div>
          <div>
            <a href="https://hackathon.telegraphprotocol.com/missions/personal-agent">Mission 09</a>
            <a href="https://docs.telegraphprotocol.com/docs/using/x402-inference">x402 inference</a>
          </div>
          <div>
            <p>Testnet only. Apps and Agents.</p>
            <p>This build does not submit to the hackathon portal.</p>
            <p>{catalog.wallet.note}</p>
          </div>
        </div>
        <div className="legal">
          <p className="credits">
            Atmosphere photographs are not product shots. They show a ridge and a night sky around the idea of
            waiting on a quote. Interface fragments on this page are the desk itself.
          </p>
          <p>© 2026 MeterBuy</p>
        </div>
      </footer>
    </main>
  );
}

function folderStyle(index: number, color: string, tab: string, delay: string): CSSProperties {
  return { ["--i" as string]: String(index), ["--c" as string]: color, ["--tab" as string]: tab, ["--d" as string]: delay };
}

function Tile({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="tile" data-reveal>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
