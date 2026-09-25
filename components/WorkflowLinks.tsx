import Link from "next/link";
import { workflowLinks } from "@/lib/guide-links";

export default function WorkflowLinks({ lang, current }: { lang: "en" | "de"; current?: string }) {
  return <aside className="card" style={{ padding: 24, marginTop: 28 }} aria-label={lang === "de" ? "Von der Messung zur Korrektur" : "From measurement to a fix"}>
    <h2 style={{ fontSize: 20 }}>{lang === "de" ? "Mach aus der Messung einen nächsten Schritt." : "Turn measurement into a next step."}</h2>
    <ul>{workflowLinks(lang).filter(l => l.href !== current).map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
  </aside>;
}
