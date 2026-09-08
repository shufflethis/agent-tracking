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
  name: "lookup_score",
  description: "Look up the Agent Readiness Score of a public website by hostname.",
  inputSchema: { type: "object", properties: { host: { type: "string", description: "Hostname, for example example.com" } }, required: ["host"] },
  annotations: { readOnlyHint: true },
  execute: async ({ host }, ctx) => {
    if (typeof host !== "string" || !host.includes(".")) throw new TypeError("host must be a hostname");
    const res = await fetch(`/api/scan?url=${encodeURIComponent(host)}`, { signal: ctx?.signal });
    const data = await res.json();
    return { content: [{ type: "text", text: `${data.host ?? host}: ${data.score ?? "n/a"}/100` }] };
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
      const mc = (document as unknown as { modelContext?: { registerTool: (t: Tool) => Promise<void> | void } }).modelContext;
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
      say(`lookup_score ok: ${r.content[0].text}`);
    } catch (err) {
      say(`lookup_score failed: ${err instanceof Error ? err.name : "error"}`);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="card" style={{ padding: 26 }}>
        <p className="smallcaps" style={{ marginBottom: 8 }}>Imperative tool: lookup_score</p>
        <p style={{ color: "var(--ink-2)", margin: "0 0 14px", maxWidth: "62ch" }}>
          Registered with document.modelContext.registerTool when a WebMCP client is present.{" "}
          {registered === "waiting" ? "Looking for a client." : registered === "native" ? "A client is present and the tool is registered." : "No WebMCP client in this browser, so the tool is not registered natively; the simulate buttons still run it through the snippet's wrapper."}
        </p>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: 0 }}>
          <button type="button" className="btn ghost" onClick={() => simulate({ host: "example.com" })}>
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
          A plain form carrying <code>toolname</code> and <code>tooldescription</code>. Submitting it is recorded as a declarative tool call with the field names, never the values.
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
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>The submit button also carries data-agent-goal, so one submission is a tool call and a conversion.</p>
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
