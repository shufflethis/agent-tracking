import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell, { Stat } from "@/components/DashboardShell";
import BarChart from "@/components/BarChart";
import { requireSite } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { clampDays } from "@/lib/tracking/stats-api";
import { sourceDetail, sourceDetailHref } from "@/lib/tracking/source-detail";
import { planFor } from "@/lib/tracking/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Source details", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ domain: string; source: string }>; searchParams: Promise<{ days?: string }> }) {
  const { domain, source } = await params;
  const { site, account } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang), de = lang === "de", days = clampDays((await searchParams).days, account);
  const data = sourceDetail(site.domain, source, days);
  if (!data) notFound();
  const referral = data.kind === "referral", base = `/app/${encodeURIComponent(site.domain)}`;
  const date = (t:number) => new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }).format(t);
  const evidence = (status:string|null,version:number) => version < 2 ? (de ? "Historischer Eintrag, nicht nachträglich verifiziert" : "Historical record, not retrospectively verified") : status === "verified" ? (de ? "IP-Abgleich bestätigt" : "IP match confirmed") : (de ? "Identität nicht bestätigt" : "Identity not confirmed");
  const series = referral ? [{key:"referrals",label:de?"Referral-Beobachtungen":"Referral observations",color:"var(--cyan)",values:data.timeline.map(d=>d.referrals)}] : [
    {key:"verified",label:de?"Bestätigte HTML-Abrufe":"Confirmed HTML fetches",color:"var(--cyan)",values:data.timeline.map(d=>d.verified)},
    {key:"legacy",label:de?"Historische Abruf-Claims":"Legacy fetch claims",color:"var(--soft-violet)",values:data.timeline.map(d=>d.legacy)},
    {key:"unverified",label:de?"Unbestätigte Claims":"Unverified claims",color:"var(--warn)",values:data.timeline.map(d=>d.unverified)},
  ];
  return <DashboardShell account={account} site={site} view="agents"><div className="shell section" style={{display:"grid",gap:24}}>
    <section><p><Link href={`${base}/agents`}>← {de ? "Alle Agenten und Quellen" : "All agents and sources"}</Link></p>
      <p className="eyebrow">{referral ? (de ? "Zugeordnete Referrals" : "Attributed referrals") : (de ? "Crawler- und Abrufsignale" : "Crawler and fetch signals")}</p>
      <h2 style={{fontSize:32}}>{data.label}</h2>
      <p>{referral ? (de ? "Welche Seiten mit dieser Referral-Zuordnung aufgerufen wurden und wann. Die Zahlen zählen Beobachtungen, keine eindeutigen Menschen oder Gespräche." : "Which pages were viewed with this referral attribution, and when. Counts represent observations, not unique people or conversations.") : (de ? "Welche Seiten unter dieser Crawler-Kennung angefragt wurden. Bestätigte Abrufe und historische oder unbestätigte Angaben bleiben getrennt." : "Which pages were requested under this crawler identity. Confirmed fetches stay separate from historical or unverified claims.")}</p>
      {!data.currentlyRecognized && <p style={{color:"var(--warn)"}}>{de ? "Diese historische Kennung gehört nicht zur aktuellen Quellenliste. Die alten Daten bleiben sichtbar, werden aber nicht neu als verifizierte KI-Aktivität eingestuft." : "This historical identity is not in the current source list. Old observations remain visible but are not reclassified as verified AI activity."}</p>}
      <nav aria-label={de?"Zeitraum":"Period"} style={{display:"flex",gap:16}}>{[7,30,90].filter(d=>d<=planFor(account.plan).windowDays).map(d=><Link key={d} href={sourceDetailHref(site.domain,data.kind,data.id,d)} aria-current={d===days?"page":undefined}>{d} {de?"Tage":"days"}</Link>)}</nav>
    </section>
    <section className="card" style={{padding:28}}>
      <div className="grid3" style={{gap:20,marginBottom:24}}>
        <Stat label={referral?(de?"Referral-Beobachtungen":"Referral observations"):(de?"Bestätigte HTML-Abrufe":"Confirmed HTML fetches")} value={String(referral?data.totals.referrals:data.totals.verified)} note={`${days} ${de?"Tage":"days"}`} />
        {!referral && <Stat label={de?"Historische Abruf-Claims":"Legacy fetch claims"} value={String(data.totals.legacy)} />}
        <Stat label={de?"Erhaltene Seitenbeobachtungen":"Retained page observations"} value={String(data.rawCount)} note={de?"Grundlage der Seitentabelle unten":"Basis of the page table below"} />
      </div>
      <h3>{de?"Verlauf pro Tag":"Daily trend"}</h3><BarChart days={data.timeline.map(d=>d.day)} series={series} />
      <p className="formnote">{series.map(s=>s.label).join(" · ")} · Europe/Berlin</p>
    </section>
    <section className="card" style={{padding:28}}><h2>{de?"Auf welchen Seiten kamen die Aufrufe an?":"Which pages received the traffic?"}</h2>
      <p>{de?`Diese Tabelle nutzt die noch vorhandenen Einzelereignisse, maximal ${data.rawRetentionDays} Tage. Tageszähler können länger erhalten bleiben. Browserbeobachtungen und Log-Zugriffe können sich überschneiden und werden nicht addiert.`:`This table uses retained individual events, up to ${data.rawRetentionDays} days. Daily totals can outlive those records. Browser observations and log requests may overlap and are not added together.`}</p>
      <div className="tablewrap"><table><thead><tr><th>{de?"Seite":"Page"}</th><th>{de?"Beobachtungen":"Observations"}</th><th>{de?"Anteil an Seitendetails":"Share of page details"}</th><th>{de?"Zuletzt beobachtet":"Last observed"}</th></tr></thead><tbody>
        {data.pages.length ? data.pages.map(p=><tr key={p.path}><td style={{overflowWrap:"anywhere"}}><code>{p.path.includes("[redacted]") ? p.path : <a href={`https://${site.domain}${p.path}`} target="_blank" rel="noopener noreferrer">{p.path} ↗</a>}</code></td><td>{p.count}</td><td>{Math.round(p.count/data.rawCount*100)}%</td><td>{date(p.lastAt)}</td></tr>) : <tr><td colSpan={4}>{de?"Keine erhaltenen Seitenereignisse für diese Quelle im Zeitraum. Daraus folgt nicht, dass keine Zugriffe stattfanden.":"No retained page events for this source in the period. This does not mean there were no requests."}</td></tr>}
      </tbody></table></div>
    </section>
    {!referral && <section className="card" style={{padding:28}}><h2>{de?"Zugriffe aus Serverlogs":"Requests from origin logs"}</h2><p>{de?"Diese Log-Auswertung bleibt von den Browserereignissen getrennt. Status, Methode und Identitätsprüfung helfen beim Untersuchen von Sperren und Fehlern.":"This log breakdown stays separate from browser events. Status, method and identity verification help investigate blocks and errors."}</p>
      <div className="tablewrap"><table><thead><tr><th>{de?"Pfad":"Path"}</th><th>HTTP</th><th>{de?"Methode":"Method"}</th><th>{de?"Identitätsprüfung":"Identity check"}</th><th>{de?"Zugriffe":"Requests"}</th></tr></thead><tbody>{data.logPages.length?data.logPages.map((p,i)=><tr key={i}><td style={{overflowWrap:"anywhere"}}><code>{p.path}</code></td><td>{p.status}</td><td>{p.method}</td><td>{p.identityStatus}</td><td>{p.count}</td></tr>):<tr><td colSpan={5}>{de?"Keine passenden Log-Zugriffe gespeichert.":"No matching log requests stored."}</td></tr>}</tbody></table></div>
    </section>}
    <section className="card" style={{padding:28}}><h2>{de?"Was wissen wir über die Herkunft?":"What do we know about the origin?"}</h2>
      <dl>
        <dt><strong>{de?"Quelle":"Source"}</strong></dt><dd>{data.label} · {referral?(de?"Zuordnung über erkannte Referrer-/UTM-Signale. Eine Herkunftsangabe beweist keinen bestimmten Gesprächsverlauf.":"Attribution through recognized referrer/UTM signals. A source label does not prove a particular conversation."):(de?"Crawler-Kennung; die Belegstufe bestimmt, ob eine Identität bestätigt ist.":"Crawler identity; the evidence level determines whether it is confirmed.")}</dd>
        <dt style={{marginTop:16}}><strong>{de?"Gestellte Frage / Prompt":"Original question / prompt"}</strong></dt><dd>{de?"Nicht verfügbar. Die ursprüngliche Frage im Assistenten wird nicht mitgeliefert und nicht aus Seitenpfaden geraten.":"Unavailable. The assistant's original question is not provided and is not guessed from page paths."}</dd>
        <dt style={{marginTop:16}}><strong>{de?"Plugin, Custom GPT oder Connector":"Plugin, custom GPT or connector"}</strong></dt><dd>{de?"Nicht nachgewiesen. Ein ChatGPT-Referral unterscheidet diese Zugangswege nicht. Erfasste MCP-Toolaufrufe sind separate Belege und nicht automatisch mit diesem Besuch verknüpft.":"Not established. A ChatGPT referral does not distinguish these entry points. Recorded MCP tool calls are separate evidence and are not automatically linked to this visit."}</dd>
        <dt style={{marginTop:16}}><strong>{de?"Genaue Referrer-URL / ursprünglicher UTM-Wert":"Exact referrer URL / original UTM value"}</strong></dt><dd>{de?"Nicht gespeichert. Vorhanden ist die zugeordnete Quelle; keine Chat-URL, Suchanfrage oder vollständige Referrer-Adresse.":"Not stored. The attributed source is available; no chat URL, search query or full referrer address is retained."}</dd>
      </dl>
    </section>
    <section className="card" style={{padding:28}}><h2>{de?"Letzte Seitenbeobachtungen":"Recent page observations"}</h2><p>{de?"Bis zu 50 Ereignisse. Zeiten: Europe/Berlin. Keine Besucherprofile oder rekonstruierten Gespräche.":"Up to 50 events. Times: Europe/Berlin. No visitor profiles or reconstructed conversations."}</p>
      <div className="tablewrap"><table><thead><tr><th>{de?"Zeit":"Time"}</th><th>{de?"Seite":"Page"}</th><th>{de?"Datenquelle":"Transport"}</th><th>{de?"Beleg":"Evidence"}</th></tr></thead><tbody>{data.recent.length?data.recent.map((r,i)=><tr key={i}><td>{date(r.t)}</td><td style={{overflowWrap:"anywhere"}}><code>{r.path}</code></td><td>{r.transport??(de?"Historisch nicht erfasst":"Not recorded historically")}</td><td>{referral?(de?"Referral-Zuordnung; kein Akteurnachweis":"Referral attribution; no actor proof"):evidence(r.identityStatus,r.version)}</td></tr>):<tr><td colSpan={4}>{de?"Keine Einzelereignisse vorhanden.":"No individual events available."}</td></tr>}</tbody></table></div>
    </section>
    <p><Link href={`${base}/insights`}>{de?"Probleme und nächste Schritte in Insights ansehen":"Review issues and next steps in Insights"} →</Link></p>
  </div></DashboardShell>;
}
