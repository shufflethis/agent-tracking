import type { Metadata } from "next";
import Link from "next/link";
import DemoTools from "@/components/DemoTools";

export const metadata: Metadata = {
  title: "Agent Tracking demo",
  description: "A page with two WebMCP tools and the tracking snippet, so the dashboard has something to show.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/demo" },
};

/**
 * The test site, on this origin.
 *
 * The plan called for a subdomain; a page here does the same job without a
 * new vhost, a certificate and a service. The snippet itself is in the root
 * layout, on every page of this site, so this host measures itself; this page
 * adds two tools and the buttons that call them.
 */
export default function Page() {
  return (
    <>
      <section className="shell" style={{ paddingTop: 56, paddingBottom: 10 }}>
        <div className="pagehead">
          <p className="eyebrow">Demo</p>
          <h1>Agent Tracking, on a page you can press</h1>
          <p className="dek" style={{ maxWidth: "62ch" }}>
            This page carries the tracking snippet and two WebMCP tools. Everything you do here lands in the dashboard for this site, marked as simulated where a button rather than an
            agent did it. <Link href="/docs">How it works</Link>.
          </p>
        </div>
      </section>
      <section className="shell section" style={{ paddingTop: 0 }}>
        <DemoTools />
      </section>
    </>
  );
}
