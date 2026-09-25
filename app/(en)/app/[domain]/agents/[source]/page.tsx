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
export default async function Page({ params, searchParams }: { params: Promise<{ domain: string; source: string }>; searchParams: Promise<{ days?: string; path?: string; q?: string }> }) {
  const { domain, source } = await params;
  const { site, account } = await requireSite(decodeURIComponent(domain));
  const query = await searchParams;
  const lang = dashLang(account.lang), de = lang === "de", days = clampDays(query.days, account);
  const data = sourceDetail(site.domain, source, days, Date.now(), query.path);
  if (!data) notFound();
  const referral = data.kind === "referral", base = `/app/${encodeURIComponent(site.domain)}`;
  const selected = data.selected, recent = selected?.recent ?? data.recent;
  const search = typeof query.q === "string" ? query.q.slice(0, 200) : "";
  const pages = data.pages.filter(p => p.path.toLowerCase().includes(search.toLowerCase()));
  const detailHref = sourceDetailHref(site.domain, data.kind, data.id, days);
  const current = referral ? data.totals.referrals : data.totals.verified;
  const previous = referral ? data.previous.referrals : data.previous.verified;
  const comparison = previous > 0 ? `${current >= previous ? "+" : ""}${Math.round((current - previous) / previous * 100)}% ${de ? "zum Vorzeitraum" : "vs previous period"}` : (de ? "Kein Prozentvergleich: Vorzeitraum ohne Beobachtungen" : "No percentage comparison: no observations in previous period");
  const transport = (value: string | null) => value === "browser" ? (de ? "Browser-Snippet" : "Browser snippet") : value === "log" ? (de ? "Serverlog" : "Origin log") : value === "server" ? (de ? "Servermeldung" : "Server report") : (de ? "Historisch nicht erfasst" : "Not recorded historically");
  const date = (t:number) => new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }).format(t);
  const evidence = (status:string|null,version:number) => version < 2 ? (de ? "Historischer Eintrag, nicht nachträglich verifiziert" : "Historical record, not retrospectively verified") : status === "verified" ? (de ? "IP-Abgleich bestätigt" : "IP match confirmed") : (de ? "Identität nicht bestätigt" : "Identity not confirmed");
  const series = referral ? [{key:"referrals",label:de?"Referral-Beobachtungen":"Referral observations",color:"var(--cyan)",values:data.timeline.map(d=>d.referrals)}] : [
    {key:"verified",label:de?"Bestätigte HTML-Abrufe":"Confirmed HTML fetches",color:"var(--cyan)",values:data.timeline.map(d=>d.verified)},
    {key:"legacy",label:de?"Historische Abruf-Claims":"Legacy fetch claims",color:"var(--soft-violet)",values:data.timeline.map(d=>d.legacy)},
    {key:"unverified",label:de?"Unbestätigte Claims":"Unverified claims",color:"var(--warn)",values:data.timeline.map(d=>d.unverified)},
  ];
  return <DashboardShell account={account} site={site} view="agents"><div className="shell section source-layout">
    <section><p><Link href={`${base}/agents`}>← {de ? "Alle Agenten und Quellen" : "All agents and sources"}</Link></p>
      <p className="eyebrow">{referral ? (de ? "Zugeordnete Referrals" : "Attributed referrals") : (de ? "Crawler- und Abrufsignale" : "Crawler and fetch signals")}</p>
      <h2 style={{fontSize:32}}>{data.label}</h2>
      <p>{referral ? (de ? "Welche Seiten mit dieser Referral-Zuordnung aufgerufen wurden und wann. Die Zahlen zählen Beobachtungen, keine eindeutigen Menschen oder Gespräche." : "Which pages were viewed with this referral attribution, and when. Counts represent observations, not unique people or conversations.") : (de ? "Welche Seiten unter dieser Crawler-Kennung angefragt wurden. Bestätigte Abrufe und historische oder unbestätigte Angaben bleiben getrennt." : "Which pages were requested under this crawler identity. Confirmed fetches stay separate from historical or unverified claims.")}</p>
      {!data.currentlyRecognized && <p style={{color:"var(--warn)"}}>{de ? "Diese historische Kennung gehört nicht zur aktuellen Quellenliste. Die alten Daten bleiben sichtbar, werden aber nicht neu als verifizierte KI-Aktivität eingestuft." : "This historical identity is not in the current source list. Old observations remain visible but are not reclassified as verified AI activity."}</p>}
      <nav className="source-periods" aria-label={de?"Zeitraum":"Period"}>{[7,30,90].filter(d=>d<=planFor(account.plan).windowDays).map(d=><Link key={d} href={sourceDetailHref(site.domain,data.kind,data.id,d) + (selected ? `&path=${encodeURIComponent(selected.path)}` : "")} aria-current={d===days?"page":undefined}>{d} {de?"Tage":"days"}</Link>)}</nav>
    </section>
    <section className="card" style={{padding:28}}>
      <div className="grid3" style={{gap:20,marginBottom:24}}>
        <Stat label={referral?(de?"Referral-Beobachtungen":"Referral observations"):(de?"Bestätigte HTML-Abrufe":"Confirmed HTML fetches")} value={String(current)} note={comparison} />
        <Stat label={de?"Vorheriger Zeitraum":"Previous period"} value={String(previous)} note={de?`Die ${days} Tage vor diesem Zeitraum · Erfassung kann abweichen`:`The ${days} days before this period · collection may differ`} />
        {!referral && <Stat label={de?"Historische Abruf-Claims":"Legacy fetch claims"} value={String(data.totals.legacy)} />}
        <Stat label={de?"Erhaltene Seitenbeobachtungen":"Retained page observations"} value={String(data.rawCount)} note={de?"Grundlage der Seitentabelle unten":"Basis of the page table below"} />
      </div>
      <h3>{de?"Verlauf pro Tag":"Daily trend"}</h3><BarChart days={data.timeline.map(d=>d.day)} series={series} />
      <p className="formnote">{series.map(s=>s.label).join(" · ")} · Europe/Berlin</p>
    </section>
    <section className="card" style={{padding:28}}><h2>{de?"Auf welchen Seiten kamen die Aufrufe an?":"Which pages received the traffic?"}</h2>
      <p>{de?`Diese Tabelle nutzt die noch vorhandenen Einzelereignisse, maximal ${data.rawRetentionDays} Tage. Tageszähler können länger erhalten bleiben. Browserbeobachtungen und Log-Zugriffe können sich überschneiden und werden nicht addiert.`:`This table uses retained individual events, up to ${data.rawRetentionDays} days. Daily totals can outlive those records. Browser observations and log requests may overlap and are not added together.`}</p>
      <form className="source-search" method="get" action={detailHref.split("?")[0]}><input type="hidden" name="days" value={days} /><label htmlFor="page-search">{de?"Seiten filtern":"Filter pages"}</label><div><input id="page-search" name="q" type="search" defaultValue={search} placeholder={de?"z. B. /de/blog":"e.g. /en/blog"} maxLength={200} /><button className="btn" type="submit">{de?"Filtern":"Filter"}</button>{search && <Link href={detailHref}>{de?"Zurücksetzen":"Reset"}</Link>}</div></form>
      <p className="formnote">{de?`${pages.length} von ${data.pages.length} Seitengruppen. Klicke einen Pfad für seinen Verlauf und die zugehörigen Ereignisse.`:`${pages.length} of ${data.pages.length} page groups. Click a path for its timeline and matching events.`}</p>
      <div className="tablewrap"><table><thead><tr><th>{de?"Seite → Details":"Page → details"}</th><th>{de?"Beobachtungen":"Observations"}</th><th>{de?"Anteil an Seitendetails":"Share of page details"}</th><th>{de?"Zuletzt beobachtet":"Last observed"}</th></tr></thead><tbody>
        {pages.length ? pages.map(p=><tr key={p.path} className={selected?.path === p.path ? "source-selected" : undefined}><td style={{overflowWrap:"anywhere"}}><Link href={`${detailHref}&path=${encodeURIComponent(p.path)}#page-detail`}><code>{p.path}</code> →</Link></td><td>{p.count}</td><td>{Math.round(p.count/data.rawCount*100)}%</td><td>{date(p.lastAt)}</td></tr>) : <tr><td colSpan={4}>{search ? (de?"Keine Seitengruppe passt zum Filter.":"No page groups match this filter.") : (de?"Keine erhaltenen Seitenereignisse für diese Quelle im Zeitraum. Daraus folgt nicht, dass keine Zugriffe stattfanden.":"No retained page events for this source in the period. This does not mean there were no requests.")}</td></tr>}
      </tbody></table></div>
      {data.pages.some(p => p.path.includes("[redacted]")) && <p className="formnote">{de?"[redacted] schützt ausgeblendete Pfadteile. Auch lange oder ID-ähnliche Blog-Slugs können darunterfallen. Mehrere URLs können in einer Gruppe zusammenfallen; bereits entfernte Pfadteile sind nicht rekonstruierbar.":"[redacted] protects hidden path segments. Long or ID-like blog slugs can also be masked. Several URLs may collapse into one group; previously removed segments cannot be reconstructed."}</p>}
    </section>
    {query.path && !selected && <p role="status">{de?"Für die ausgewählte Seitengruppe sind in diesem Zeitraum keine Ereignisse erhalten.":"No events are retained for the selected page group in this period."} <Link href={detailHref}>{de?"Alle Seiten":"All pages"} →</Link></p>}
    {selected && <section id="page-detail" className="card source-page-detail">
      <div className="source-detail-heading"><div><p className="eyebrow">{de?"Seitendetails":"Page details"} · {data.label}</p><h2><code>{selected.path}</code></h2></div><Link href={detailHref}>{de?"Auswahl aufheben":"Clear selection"}</Link></div>
      {!selected.path.includes("[redacted]") && <p><a href={`https://${site.domain}${selected.path}`} target="_blank" rel="noopener noreferrer">{de?"Seite öffnen":"Open page"} ↗</a></p>}
      <div className="source-page-stats"><Stat label={de?"Beobachtungen":"Observations"} value={String(selected.count)} note={`${Math.round(selected.count/data.rawCount*100)}% ${de?"aller erhaltenen Seitendetails dieser Quelle":"of all retained page details for this source"}`} /><Stat label={de?"Tage mit Beobachtungen":"Days with observations"} value={String(selected.activeDays)} note={`${days} ${de?"Tage im Zeitraum":"days in period"}`} /><Stat label={de?"Erstmals im Zeitraum":"First in this period"} value={date(selected.firstAt)} /><Stat label={de?"Zuletzt im Zeitraum":"Last in this period"} value={date(selected.lastAt)} /></div>
      <h3>{de?"Tagesverlauf dieser Seitengruppe":"Daily trend for this page group"}</h3><BarChart days={selected.timeline.map(d=>d.day)} series={[{key:"observations",label:de?"Seitenbeobachtungen":"Page observations",color:"var(--cyan)",values:selected.timeline.map(d=>d.count)}]} />
      <p className="formnote">Europe/Berlin · {selected.transports.map(r=>`${transport(r.transport)}: ${r.count}`).join(" · ")}</p>
      <p className="formnote">{de?"Nur erhaltene Ereignisse dieser Quelle und Seitengruppe. Zeitliche Nähe belegt weder dieselbe Person noch denselben Chat.":"Retained events for this source and page group only. Nearby timestamps do not establish the same person or chat."}</p>
      <Link href="#recent-observations">{de?"Zugehörige Ereignisse ansehen":"View matching events"} ↓</Link>
    </section>}
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
    <section id="recent-observations" className="card" style={{padding:28}}><h2>{selected ? (de?"Ereignisse dieser Seitengruppe":"Events for this page group") : (de?"Letzte Seitenbeobachtungen":"Recent page observations")}</h2><p>{de?"Bis zu 50 Ereignisse. Zeiten: Europe/Berlin. Keine Besucherprofile oder rekonstruierten Gespräche.":"Up to 50 events. Times: Europe/Berlin. No visitor profiles or reconstructed conversations."}</p>
      {selected && <p><code>{selected.path}</code> · {recent.length} / {selected.count}</p>}
      <div className="tablewrap"><table><thead><tr><th>{de?"Zeit":"Time"}</th><th>{de?"Seite":"Page"}</th><th>{de?"Datenquelle":"Transport"}</th><th>{de?"Beleg":"Evidence"}</th></tr></thead><tbody>{recent.length?recent.map((r,i)=><tr key={i}><td>{date(r.t)}</td><td style={{overflowWrap:"anywhere"}}><code>{r.path}</code></td><td>{transport(r.transport)}</td><td>{referral?(de?"Referral-Zuordnung; kein Akteurnachweis":"Referral attribution; no actor proof"):evidence(r.identityStatus,r.version)}</td></tr>):<tr><td colSpan={4}>{de?"Keine Einzelereignisse vorhanden.":"No individual events available."}</td></tr>}</tbody></table></div>
    </section>
    <p><Link href={`${base}/insights`}>{de?"Probleme und nächste Schritte in Insights ansehen":"Review issues and next steps in Insights"} →</Link></p>
  </div></DashboardShell>;
}
