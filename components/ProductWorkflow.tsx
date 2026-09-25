import Link from "next/link";

export default function ProductWorkflow({ lang }: { lang: "en" | "de" }) {
  const de = lang === "de";
  const steps = de
    ? [
        ["1. Messen", "Erkennbare Referrals, unterstützte Browser-Tools und Origin-Log-Anfragen mit sichtbarer Identitätsprüfung getrennt auswerten."],
        ["2. Bestätigen", "Dein Site-Server meldet echte Anfragen oder Buchungen per widerrufbarem Schreibzugang. Browser-Zielmarker bleiben Versuche."],
        ["3. Nachtesten", "Einen Anfrageweg mit dem deterministischen Browser-Test auf Test- oder Staging-Domains reproduzieren, Korrektur und Version festhalten und denselben Fall erneut prüfen."],
        ["4. Berichten", "Befunde, Belege und echte Nachtests in einem geschützten Bericht bündeln. Leserechte gelten pro Site; öffentliche Statistiken zeigen keine internen Fälle."],
      ]
    : [
        ["1. Measure", "Keep identifiable referrals, supported browser tools and origin-log requests separate, with the available identity evidence visible."],
        ["2. Confirm", "Your site server reports real inquiries or bookings with a revocable write credential. Browser goal markers remain attempts."],
        ["3. Retest", "Reproduce an inquiry path with a deterministic browser check on a test or staging host, record the fix and version, then run the same case again."],
        ["4. Report", "Collect findings, evidence and real retests in a protected report. Reader access is scoped to a site; public stats expose no internal cases."],
      ];

  return (
    <section className="shell section centered" id="workflow">
      <h2>{de ? "Von der Beobachtung zum überprüften Ergebnis" : "From observation to a checked result"}</h2>
      <p className="dek" style={{ maxWidth: "72ch" }}>
        {de
          ? "Die öffentliche Statistik zeigt nur ausgewählte Summen. Der geschützte Arbeitsbereich verbindet Messzustand, technische Fehler, bestätigte Serverbelege und Nachtests, ohne unterschiedliche Zähler als Conversion-Rate auszugeben."
          : "The public stats page shows selected totals. The protected workspace brings together measurement status, technical failures, confirmed server receipts and retests without turning unrelated counts into a conversion rate."}
      </p>
      <div className="grid2" style={{ gap: 18, marginTop: 24, textAlign: "left" }}>
        {steps.map(([title, description]) => (
          <div className="card" key={title} style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 8px" }}>{title}</h3>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>{description}</p>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 22 }}>
        <Link href={de ? "/de/docs#private-workflow" : "/docs#private-workflow"}>
          {de ? "Funktionen und Grenzen im Detail" : "See the features and their limits"}
        </Link>
      </p>
    </section>
  );
}
