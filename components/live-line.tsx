"use client";

import { useEffect, useState } from "react";

export function LiveLine() {
  const [line, setLine] = useState("Checking whether the Telegraph testnet catalog is answering.");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/telegraph/status", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((data: { engine?: { reachable?: boolean; intentCount?: number | null }; quoteUsd?: number }) => {
        if (!data.engine?.reachable) {
          setLine("The engine did not answer just now. The desk still opens, and Mock stays labeled as Mock.");
          return;
        }
        const count = data.engine.intentCount ?? "The";
        const quote = typeof data.quoteUsd === "number" ? data.quoteUsd.toFixed(2) : "0.01";
        setLine(`${count} intents are listed on the testnet catalog. A quote is about $${quote}.`);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLine("The status check did not answer. You can still run the desk.");
      });
    return () => controller.abort();
  }, []);

  return <p className="live-line">{line}</p>;
}
