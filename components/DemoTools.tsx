"use client";

import { useEffect, useState } from "react";

/**
 * Two WebMCP tools for the tracking demo: one imperative, one declarative.
 *
 * Deliberately not in lib/tools.ts and not on the MCP server: they exist to
 * exercise agent.js on this origin, and the site's own tool list must stay
 * the list of tools an agent should call. The simulate button runs the same
 * wrapped tool an agent would, through the snippet's own wrapper, marked
 * simulated so the dashboard never counts it as an agent.
 */

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean };
  execute: (args: Record<string, unknown>, ctx?: { signal?: AbortSignal }) => Promise<{ content: { type: "text"; text: string }[] }>;
};

const lookupTool: Tool = {
  name: "lookup_public_stats",
  description: "Look up published 30-day AI agent statistics of a public website by hostname.",
  inputSchema: { type: "object", properties: { host: { type: "string", description: "Hostname, for example agenttracking.co" } }, required: ["host"] },
  annotations: { readOnlyHint: true },
  execute: async ({ host }, ctx) => {
    if (typeof host !== "string" || !host.includes(".")) throw new TypeError("host must be a hostname");
    const res = await fetch(`/api/public-stats/${encodeURIComponent(host)}`, { signal: ctx?.signal });
    if (res.ok) {
      const data = await res.json();
      const interactions = data?.totals?.interactions ?? 0;
      const verified = data?.totals?.verifiedFetches ?? 0;
      return { content: [{ type: "text", text: `${data.domain ?? host}: ${interactions} observed interactions (${verified} IP-verified fetches, 30d)` }] };
    }
    const cardRes = await fetch("/.well-known/mcp.json", { signal: ctx?.signal });
    if (!cardRes.ok) throw new Error(`HTTP ${res.status}`);
    const card = await cardRes.json();
    return { content: [{ type: "text", text: `${host}: MCP server ${card.name ?? "ready"} (v${card.version ?? "1.0"})` }] };
  },
};

declare global {
  interface Window {
    __wmtSimulate?: (tool: Tool, args?: Record<string, unknown>) => Promise<unknown>;
  }
}

export default function DemoTools() {
  const [registered, setRegistered] = useState<"waiting" | "native" | "none">("waiting");
  const [log, setLog] = useState<string[]>([]);
  const say = (line: string) => setLog((l) => [`${new Date().toISOString().slice(11, 19)} ${line}`, ...l].slice(0, 12));

  useEffect(() => {
    let tries = 0;
    const poll = setInterval(() => {
      const mc =
        (navigator as unknown as { modelContext?: { registerTool: (t: Tool) => Promise<void> | void } }).modelContext ??
        (document as unknown as { modelContext?: { registerTool: (t: Tool) => Promise<void> | void } }).modelContext;
      if (mc) {
        clearInterval(poll);
        // After agent.js wrapped registerTool, so this registration is recorded.
        Promise.resolve(mc.registerTool(lookupTool))
          .then(() => setRegistered("native"))
          .catch(() => setRegistered("none"));
      } else if (++tries > 20) {
        clearInterval(poll);
        setRegistered("none");
      }
    }, 300);
    return () => clearInterval(poll);
  }, []);

  async function simulate(args: Record<string, unknown>) {
    if (!window.__wmtSimulate) return say("agent.js is not loaded on this page");
    try {
      const r = (await window.__wmtSimulate(lookupTool, args)) as { content: { text: string }[] };
      say(`lookup_public_stats ok: ${r.content[0].text}`);
    } catch (err) {
      say(`lookup_public_stats failed: ${err instanceof Error ? err.name : "error"}`);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="card" style={{ padding: 26 }}>
        <p className="smallcaps" style={{ marginBottom: 8 }}>Imperative tool: lookup_public_stats</p>
        <p style={{ color: "var(--ink-2)", margin: "0 0 14px", maxWidth: "62ch" }}>
          Registered with navigator.modelContext.registerTool when a WebMCP client is present.{" "}
          {registered === "waiting" ? "Looking for a client." : registered === "native" ? "A client is present and the tool is registered." : "No WebMCP client in this browser, so the tool is not registered natively; the simulate buttons still run it through the snippet's wrapper."}
        </p>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: 0 }}>
          <button type="button" className="btn ghost" onClick={() => simulate({ host: typeof location !== "undefined" ? location.hostname : "agenttracking.co" })}>
            Simulate a successful call
          </button>
          <button type="button" className="btn ghost" onClick={() => simulate({ host: "nope" })}>
            Simulate a failing call
          </button>
        </p>
      </div>

      <div className="card" style={{ padding: 26 }}>
        <p className="smallcaps" style={{ marginBottom: 8 }}>Declarative tool: a form with toolname</p>
        <p style={{ color: "var(--ink-2)", margin: "0 0 14px", maxWidth: "62ch" }}>
          A plain form carrying <code>toolname</code> and <code>tooldescription</code>. Submitting it is recorded as a declarative tool call without field names or values.
        </p>
        <form
          className="scanform"
          {...({ toolname: "subscribe_updates", tooldescription: "Subscribe an email address to product updates." } as Record<string, string>)}
          onSubmit={(e) => {
            e.preventDefault();
            say("subscribe_updates submitted (declarative)");
          }}
        >
          <input type="email" name="email" placeholder="you@company.com" aria-label="Email" required />
          <button className="btn ghost" type="submit" data-agent-goal="newsletter_signup">
            Subscribe
          </button>
        </form>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>The submit button also carries data-agent-goal, so one submission can record a tool call and an unverified goal attempt. A confirmed outcome needs a server receipt.</p>
      </div>

      <div className="card" style={{ padding: 26 }}>
        <p className="smallcaps" style={{ marginBottom: 8 }}>What just happened</p>
        {log.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-2)" }}>
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: "var(--muted)" }}>Nothing yet. Press a button above.</p>
        )}
      </div>
    </div>
  );
}
