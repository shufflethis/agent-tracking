import type { DashLang } from "@/lib/tracking/copy";

/**
 * Question-shaped guides: each answers one thing a person types into a search
 * box or asks an assistant, in the words they use. One structure in both
 * languages, rendered by app/(en)/guides and app/(de)/de/guides, listed in
 * llms.txt, with Article and FAQ schema on each page.
 */

export type GuideSection = { h: string; p: string[]; code?: string; codeLang?: string };
export type Guide = {
  slug: string;
  question: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  related: string[];
};

const SNIPPET = `<script defer data-domain="example.com" src="https://agenttracking.co/agent.js"></script>`;
const GOAL = `<button type="submit" data-agent-goal="order_placed">Place order</button>`;
const TOOL = `await navigator.modelContext.registerTool({
  name: "add_to_cart",
  description: "Add a product to the cart by SKU.",
  inputSchema: { type: "object", properties: { sku: { type: "string" }, qty: { type: "integer" } }, required: ["sku"] },
  execute: async ({ sku, qty }) => { /* your code */ },
});`;
const LOG = `curl -sS -X POST https://agenttracking.co/api/logs/example.com \\
  -H "Authorization: Bearer wmt_your_token" \\
  -H "Content-Type: text/plain" --data-binary @/var/log/nginx/access.log`;
const MCP = `{ "mcpServers": { "agent-tracking": { "url": "https://agenttracking.co/api/mcp",
  "headers": { "Authorization": "Bearer wmt_your_token" } } } }`;

const EN: Guide[] = [
  {
    slug: "measure-ai-agent-behaviour-on-your-website",
    question: "How do I measure what AI agents do on my website?",
    title: "How to measure AI agent behaviour on your website",
    summary:
      "Agents reach a site in three ways: as a referral (a person sent by ChatGPT or Perplexity), as a fetch (the agent itself loading a page) and as a tool call (the agent operating your MCP or WebMCP tools). Measuring agent behaviour means recording all three, with the agent named, and reading them side by side.",
    sections: [
      { h: "What counts as agent behaviour", p: ["A crawler reading 400 pages overnight, a live assistant fetching three pages in four seconds to answer a question, a person arriving from a chat, and an assistant calling a tool inside the browser are four different behaviours with four different meanings. Ordinary analytics folds the first three into one line labelled Direct or Other and never sees the fourth.", "To measure behaviour you need each event with three facts: which agent, which page or tool, and what happened next."] },
      { h: "Step 1: one line of script", p: ["Add your site in the dashboard and put the snippet on every page. It records the page path (no query string), whether the visit came from or was made by an AI assistant, and every MCP or WebMCP tool registration and call. No cookies, no network address stored."], code: SNIPPET, codeLang: "html" },
      { h: "Step 2: your server log for crawlers", p: ["Most crawlers never run JavaScript, so the snippet cannot see them. Upload your access log on the settings page or send it daily from a cron with the API token. Each line is matched against the agent list and checked against the vendor's published IP ranges; an impostor claiming to be GPTBot from a random address is listed as unverified, not counted."], code: LOG, codeLang: "sh" },
      { h: "Step 3: read the four views", p: ["Overview shows referrals, fetches, tool calls and conversions per day with the trend against the previous period. Agents lists who sent visitors and who fetched pages, with share, trend, bursts and verification. Tools shows calls, success rate, average duration and top errors per tool. Pages shows what agents fetch and where tools are called.", "A burst is one agent fetching several pages within seconds: the footprint of an assistant answering one question about you. Watching which pages a burst takes tells you what the assistant considered relevant."] },
      { h: "Step 4: ask instead of browsing", p: ["Every number is available as JSON and as an MCP tool. Point Claude, ChatGPT or Cursor at it and ask which agents read your site this week and which tool failed most."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Can I measure agents without a script on the page?", a: "Partly. The server log gives you crawler fetches and bursts. Referrals and tool calls happen in the browser and need the snippet." },
      { q: "Does it slow the site down?", a: "The snippet is 4.5 KB, loads deferred and sends small batches with sendBeacon. Nothing blocks rendering." },
    ],
    related: ["see-whether-ai-agents-buy-on-your-site", "which-ai-assistants-send-visitors", "which-ai-crawlers-read-my-pages"],
  },
  {
    slug: "see-whether-ai-agents-buy-on-your-site",
    question: "How do I see whether AI agents buy on my site?",
    title: "How to see whether AI agents buy, book or sign up on your site",
    summary:
      "Mark the moment that matters with one attribute, data-agent-goal, or mark a tool as a goal. Agent Tracking then counts conversions reached by agents separately from people, and shows whether the agents that called your tools actually got to the end.",
    sections: [
      { h: "Why a tool call is not a sale", p: ["An assistant can add to the cart, fill the form and still fail at checkout because a field it cannot see is required. The Tools view shows the call; only a goal shows the completion. The distance between the two is your agent conversion rate, and it is usually the most surprising number in the dashboard."] },
      { h: "Step 1: mark the goal", p: ["Put data-agent-goal on the element that means done: the order button, the booking confirmation, the signup submit. When it is clicked or the form is submitted, the snippet records a conversion with the goal's name."], code: GOAL, codeLang: "html" },
      { h: "Step 2: give agents a tool worth finishing", p: ["If your site exposes WebMCP tools, the snippet wraps them automatically. Register the checkout tool as the specification says and every call is recorded with duration, outcome and the names of the input keys."], code: TOOL, codeLang: "js" },
      { h: "Step 3: read Conversions next to Tool calls", p: ["The overview shows both per day. The Tools view shows, per tool, how many calls failed and with which error class, which is where the lost purchases are. A tool with a good success rate and no conversions is a checkout agents cannot finish; a goal with conversions and no tool calls is people, not agents."] },
      { h: "What you will not see", p: ["No order value, no customer, no basket contents. The conversion carries the goal name, the page and the agent class, nothing else. If you want revenue per agent, join the goal name with your own order data by time; the dashboard deliberately does not hold it."] },
    ],
    faq: [
      { q: "Does this work without WebMCP tools?", a: "Yes. data-agent-goal works on any button or form. Tool calls are the extra layer for sites that publish tools." },
      { q: "Can a person trigger an agent conversion?", a: "The conversion is attributed to an agent when the session was classified as one, from the referrer or user agent. A person arriving from ChatGPT who then buys is an AI referral conversion; a plain visitor is not counted as an agent." },
    ],
    related: ["track-mcp-and-webmcp-tool-calls", "measure-ai-agent-behaviour-on-your-website"],
  },
  {
    slug: "which-ai-assistants-send-visitors",
    question: "Which AI assistants send visitors to my site?",
    title: "How to know which AI assistants send visitors to your site",
    summary:
      "ChatGPT, Perplexity, Claude, Copilot and Gemini send people to websites with a referrer or a utm_source most analytics tools do not classify. Agent Tracking matches both against a published, versioned list and shows the assistant, the landing page and the trend.",
    sections: [
      { h: "Where the signal is", p: ["A click in ChatGPT arrives with the referrer chatgpt.com; Perplexity with perplexity.ai; some assistants add utm_source=chatgpt.com. Google Analytics files most of these under Referral or Direct, and you have to know the host names to build a segment. The list here is maintained in one file, versioned, and covers a dozen assistants."] },
      { h: "What the Agents view shows", p: ["Each assistant as a row of kind referral: how many visitors in the window, the share of all agent traffic, the trend against the previous period. The Pages view shows where they land, which is usually not the homepage."] },
      { h: "Why this is the GEO number", p: ["Generative engine optimisation is guesswork until you know which assistant actually recommends you and for which page. Two weeks of referrals tell you which content assistants cite and which they ignore; that is the feedback loop the discipline was missing."] },
      { h: "Reading it from your own tools", p: ["The same rows come back from the stats API and the MCP tool, so a weekly report or a Claude question can read them without opening the dashboard."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Do all assistants send a referrer?", a: "No. Some open links in ways that strip it. Those visits are counted as ordinary views, not as agents. The number you see is a floor, not an estimate." },
      { q: "Is the assistant's user identified?", a: "No. The session id is a daily-salted hash; the address is not stored, no cookie is set, and nothing about the person is recorded." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-crawlers-read-my-pages"],
  },
  {
    slug: "which-ai-crawlers-read-my-pages",
    question: "Which AI crawlers read my pages, and are they real?",
    title: "How to see which AI crawlers read your pages, and verify they are real",
    summary:
      "GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended and their kind announce themselves in the user agent, and anyone can fake that string. Agent Tracking counts them from your server log and verifies each line against the IP ranges the vendor publishes.",
    sections: [
      { h: "Why the snippet is not enough", p: ["Crawlers fetch raw HTML and never execute a script, so a browser-side tracker does not see them at all. The server log does, one line per request, with the user agent and the address."] },
      { h: "Step 1: send the log", p: ["Upload on the settings page or post it daily with the API token. nginx and Apache combined format, plain or gzipped, whole files; lines older than the newest already imported are skipped."], code: LOG, codeLang: "sh" },
      { h: "Step 2: verification against published ranges", p: ["OpenAI, Anthropic's partners, Perplexity, Microsoft, Google and Apple publish the address ranges their crawlers use. Every line claiming one of them is checked; a match counts, a miss is listed as unverified. The ranges are refreshed nightly.", "Unverified does not mean malicious, but it does mean the request did not come from where the vendor says it would, which is worth knowing before you trust a robots.txt rule to hold."] },
      { h: "Step 3: bursts", p: ["One agent, several pages, a few seconds: that is an assistant answering a question about you, not a crawl. The Agents view counts bursts per agent and lists the recent ones with their pages, so you can see which of your pages an assistant pulled together to answer."] },
    ],
    faq: [
      { q: "Which crawlers are on the list?", a: "The list is public in the repository and versioned; the docs page prints the current version. Missing one? Open a pull request with the vendor's documentation." },
      { q: "Is the address stored?", a: "No. It is used while the upload is processed, to group one agent's fetches and to check the range, and discarded when the request ends. The log file is not kept." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-assistants-send-visitors"],
  },
  {
    slug: "track-mcp-and-webmcp-tool-calls",
    question: "How do I track MCP and WebMCP tool calls on my site?",
    title: "How to track MCP and WebMCP tool calls on your site",
    summary:
      "If your pages register tools through navigator.modelContext or document.modelContext, or expose declarative forms with a toolname, the snippet records every registration and every call: name, duration, success or failure, error class and the names of the input keys, never their values.",
    sections: [
      { h: "Nothing to change in your code", p: ["The snippet wraps registerTool and provideContext before your code runs. Register tools as the specification says and they appear in the Tools view. Declarative tools, forms carrying a toolname attribute, are caught on submit."], code: TOOL, codeLang: "js" },
      { h: "What the Tools view answers", p: ["Per tool: calls, success rate, average duration, the top three error messages, whether it is declarative, when it was last seen, and whether it has ever been called. The last one matters most: a tool nobody calls has a description agents do not understand or a schema they cannot fill."] },
      { h: "Input keys, never values", p: ["The names of the argument keys are recorded so you can see that agents send sku but never qty. The values are not, so nothing a person typed reaches the server."] },
      { h: "The manifest", p: ["If you publish /.well-known/webmcp, the snippet hashes it once per visit. The dashboard shows when it last changed; on Pro and Agency plans an email goes out when it does, which catches a deploy that silently dropped a tool."] },
    ],
    faq: [
      { q: "Does it see MCP servers that agents call outside the browser?", a: "No. It sees tools called inside the page through the browser's model context API. A remote MCP server has its own logs; this measures the browser side." },
      { q: "Can I test it without an agent?", a: "Yes. The demo page has two tools and a simulate button; simulated calls are marked and never counted as agents." },
    ],
    related: ["see-whether-ai-agents-buy-on-your-site", "measure-ai-agent-behaviour-on-your-website"],
  },
  {
    slug: "ai-agent-analytics-without-cookie-banner",
    question: "Do I need a cookie banner for AI agent analytics?",
    title: "AI agent analytics without a cookie banner: how it stays legal",
    summary:
      "Consent under the ePrivacy rules is for storing or reading something on the visitor's device. Agent Tracking stores nothing there: no cookie, no local storage, no fingerprint. The session id is a hash of a value that changes daily, the address is not kept, and the data stays on a server in Germany under a data processing agreement.",
    sections: [
      { h: "What triggers consent, and what does not", p: ["The banner obligation attaches to access to the terminal device: cookies, local storage, and techniques that read device characteristics to build a fingerprint. A script that sends the page path and the referrer host, and keeps no identifier that survives the day, does not touch the device in that sense. That is the reasoning cookieless analytics rests on, and it is the reasoning here."] },
      { h: "What is recorded", p: ["Page path without query string; referrer host and utm_source only when they name an assistant; tool name, duration, outcome, error class and input key names; a session id computed from a daily random salt, the domain, a coarse browser class and the address, hashed to 16 characters. The address itself is not stored."] },
      { h: "Where it lives, and under what contract", p: ["One server in Germany. Adding a site concludes the data processing agreement under Art. 28 GDPR, which names the sub-processors, includes the EU standard contractual clauses and describes the processing as the code does it. The source is public, so a data protection officer can check the description against the implementation."] },
      { h: "If even that is too much", p: ["Run it yourself. The software is AGPL-3.0 and installs with one compose file; the data then never leaves your own machine."] },
    ],
    faq: [
      { q: "Is the daily hash personal data?", a: "It is treated as pseudonymous data and processed on the site owner's behalf under the DPA. It cannot be linked across days and cannot be resolved to a person, because the input that would allow it, the address, is not stored." },
      { q: "Is this legal advice?", a: "No. It is a description of what the software does and the reasoning the design follows. Your own assessment, or your lawyer's, decides." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website"],
  },
];

const DE: Guide[] = [
  {
    slug: "verhalten-von-ki-agenten-auf-der-website-messen",
    question: "Wie messe ich das Verhalten von KI-Agenten auf meiner Website?",
    title: "Verhalten von KI-Agenten auf der Website messen",
    summary:
      "Agenten erreichen eine Site auf drei Wegen: als Referral (ein Mensch, den ChatGPT oder Perplexity geschickt hat), als Abruf (der Agent lädt selbst eine Seite) und als Tool-Aufruf (der Agent bedient deine MCP- oder WebMCP-Tools). Agentenverhalten messen heißt, alle drei mit Namen des Agenten zu erfassen und nebeneinander zu lesen.",
    sections: [
      { h: "Was als Agentenverhalten zählt", p: ["Ein Crawler, der nachts 400 Seiten liest, ein Assistent, der in vier Sekunden drei Seiten holt, um eine Frage zu beantworten, ein Mensch aus einem Chat und ein Assistent, der im Browser ein Tool aufruft: vier Verhaltensweisen mit vier Bedeutungen. Normale Analytics faltet die ersten drei in eine Zeile namens Direct oder Sonstige und sieht die vierte nie.", "Für die Messung braucht jedes Ereignis drei Angaben: welcher Agent, welche Seite oder welches Tool, und was danach passiert ist."] },
      { h: "Schritt 1: eine Zeile Script", p: ["Site im Dashboard anlegen und das Snippet auf jede Seite setzen. Es erfasst den Seitenpfad (ohne Query-String), ob der Besuch von einem KI-Assistenten kam oder durch einen erfolgte, und jede Registrierung und jeden Aufruf von MCP- und WebMCP-Tools. Keine Cookies, keine gespeicherte Netzwerkadresse."], code: SNIPPET, codeLang: "html" },
      { h: "Schritt 2: das Server-Log für Crawler", p: ["Die meisten Crawler führen kein JavaScript aus, das Snippet sieht sie nicht. Lade das Access-Log auf der Einstellungsseite hoch oder schick es täglich per Cron mit dem API-Token. Jede Zeile wird gegen die Agentenliste und die veröffentlichten IP-Bereiche des Anbieters geprüft; ein Nachahmer, der sich von einer beliebigen Adresse als GPTBot ausgibt, landet als unverifiziert, nicht in der Zählung."], code: LOG, codeLang: "sh" },
      { h: "Schritt 3: die vier Ansichten lesen", p: ["Überblick zeigt Referrals, Abrufe, Tool-Aufrufe und Conversions pro Tag mit Trend zur Vorperiode. Agenten listet, wer Besucher geschickt und wer Seiten geholt hat, mit Anteil, Trend, Bursts und Verifikation. Tools zeigt Aufrufe, Erfolgsquote, Dauer und häufigste Fehler je Tool. Seiten zeigt, was Agenten abrufen und wo Tools aufgerufen werden.", "Ein Burst ist ein Agent, der innerhalb von Sekunden mehrere Seiten holt: die Spur eines Assistenten, der eine Frage über dich beantwortet. Welche Seiten ein Burst nimmt, zeigt, was der Assistent für relevant hielt."] },
      { h: "Schritt 4: fragen statt klicken", p: ["Jede Zahl gibt es als JSON und als MCP-Tool. Richte Claude, ChatGPT oder Cursor darauf und frag, welche Agenten deine Site diese Woche gelesen haben und welches Tool am häufigsten gescheitert ist."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Kann ich Agenten ohne Script auf der Seite messen?", a: "Teilweise. Das Server-Log liefert Crawler-Abrufe und Bursts. Referrals und Tool-Aufrufe passieren im Browser und brauchen das Snippet." },
      { q: "Bremst es die Site?", a: "Das Snippet hat 4,5 KB, lädt mit defer und schickt kleine Batches per sendBeacon. Nichts blockiert das Rendern." },
    ],
    related: ["sehen-ob-ki-agenten-auf-der-site-kaufen", "welche-ki-assistenten-schicken-besucher", "welche-ki-crawler-lesen-meine-seiten"],
  },
  {
    slug: "sehen-ob-ki-agenten-auf-der-site-kaufen",
    question: "Wie sehe ich, ob KI-Agenten bei mir auf der Seite einkaufen?",
    title: "Sehen, ob KI-Agenten auf deiner Site kaufen, buchen oder sich anmelden",
    summary:
      "Markiere den entscheidenden Moment mit einem Attribut, data-agent-goal, oder markiere ein Tool als Ziel. Agent Tracking zählt dann Conversions von Agenten getrennt von Menschen und zeigt, ob die Agenten, die deine Tools aufgerufen haben, wirklich bis zum Ende gekommen sind.",
    sections: [
      { h: "Warum ein Tool-Aufruf kein Verkauf ist", p: ["Ein Assistent kann in den Warenkorb legen, das Formular füllen und trotzdem am Checkout scheitern, weil ein Feld Pflicht ist, das er nicht sieht. Die Tools-Ansicht zeigt den Aufruf; erst ein Ziel zeigt den Abschluss. Der Abstand zwischen beiden ist deine Agenten-Conversion-Rate, und meist die überraschendste Zahl im Dashboard."] },
      { h: "Schritt 1: das Ziel markieren", p: ["Setze data-agent-goal auf das Element, das fertig bedeutet: den Bestellknopf, die Buchungsbestätigung, das Anmelde-Submit. Beim Klick oder Absenden erfasst das Snippet eine Conversion mit dem Namen des Ziels."], code: GOAL, codeLang: "html" },
      { h: "Schritt 2: Agenten ein Tool geben, das sich zu Ende führen lässt", p: ["Wenn deine Site WebMCP-Tools bereitstellt, umhüllt das Snippet sie automatisch. Registriere das Checkout-Tool wie in der Spezifikation, und jeder Aufruf wird mit Dauer, Ergebnis und den Namen der Eingabefelder erfasst."], code: TOOL, codeLang: "js" },
      { h: "Schritt 3: Conversions neben Tool-Aufrufen lesen", p: ["Der Überblick zeigt beides pro Tag. Die Tools-Ansicht zeigt je Tool, wie viele Aufrufe mit welcher Fehlerklasse gescheitert sind, und da stecken die verlorenen Käufe. Ein Tool mit guter Erfolgsquote und ohne Conversions ist ein Checkout, den Agenten nicht abschließen können; ein Ziel mit Conversions und ohne Tool-Aufrufe sind Menschen, keine Agenten."] },
      { h: "Was du nicht sehen wirst", p: ["Keinen Bestellwert, keinen Kunden, keinen Warenkorbinhalt. Die Conversion trägt Zielname, Seite und Agentenklasse, sonst nichts. Willst du Umsatz je Agent, verknüpfe den Zielnamen zeitlich mit deinen eigenen Bestelldaten; das Dashboard hält sie bewusst nicht."] },
    ],
    faq: [
      { q: "Geht das ohne WebMCP-Tools?", a: "Ja. data-agent-goal funktioniert auf jedem Knopf und Formular. Tool-Aufrufe sind die zusätzliche Schicht für Sites, die Tools veröffentlichen." },
      { q: "Kann ein Mensch eine Agenten-Conversion auslösen?", a: "Die Conversion wird einem Agenten zugeschrieben, wenn die Sitzung als solcher erkannt wurde, über Referrer oder User-Agent. Ein Mensch, der von ChatGPT kommt und kauft, ist eine KI-Referral-Conversion; ein normaler Besucher zählt nicht als Agent." },
    ],
    related: ["mcp-und-webmcp-tool-aufrufe-erfassen", "verhalten-von-ki-agenten-auf-der-website-messen"],
  },
  {
    slug: "welche-ki-assistenten-schicken-besucher",
    question: "Welche KI-Assistenten schicken Besucher auf meine Site?",
    title: "Wissen, welche KI-Assistenten Besucher auf deine Site schicken",
    summary:
      "ChatGPT, Perplexity, Claude, Copilot und Gemini schicken Menschen mit einem Referrer oder einem utm_source, den die meisten Analytics-Werkzeuge nicht zuordnen. Agent Tracking gleicht beides mit einer veröffentlichten, versionierten Liste ab und zeigt Assistent, Landingpage und Trend.",
    sections: [
      { h: "Wo das Signal steckt", p: ["Ein Klick in ChatGPT kommt mit dem Referrer chatgpt.com, Perplexity mit perplexity.ai, manche Assistenten hängen utm_source=chatgpt.com an. Google Analytics legt das meiste unter Referral oder Direct ab, und man muss die Hostnamen kennen, um ein Segment zu bauen. Die Liste hier steht in einer Datei, versioniert, mit einem Dutzend Assistenten."] },
      { h: "Was die Agenten-Ansicht zeigt", p: ["Jeder Assistent als Zeile der Art Referral: wie viele Besucher im Zeitraum, Anteil am gesamten Agententraffic, Trend zur Vorperiode. Die Seiten-Ansicht zeigt, wo sie landen, und das ist meist nicht die Startseite."] },
      { h: "Warum das die GEO-Zahl ist", p: ["Generative Engine Optimization ist Raten, bis du weißt, welcher Assistent dich tatsächlich empfiehlt und für welche Seite. Zwei Wochen Referrals zeigen, welche Inhalte Assistenten zitieren und welche sie ignorieren; das ist die Rückkopplung, die der Disziplin gefehlt hat."] },
      { h: "Aus den eigenen Werkzeugen lesen", p: ["Dieselben Zeilen kommen aus der Stats-API und dem MCP-Tool, sodass ein Wochenbericht oder eine Frage an Claude sie lesen kann, ohne das Dashboard zu öffnen."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Schicken alle Assistenten einen Referrer?", a: "Nein. Manche öffnen Links so, dass er fehlt. Diese Besuche zählen als normale Aufrufe, nicht als Agenten. Die Zahl ist eine Untergrenze, keine Schätzung." },
      { q: "Wird der Nutzer des Assistenten identifiziert?", a: "Nein. Die Sitzungskennung ist ein täglich neu gesalzener Hash; die Adresse wird nicht gespeichert, kein Cookie gesetzt, nichts über die Person erfasst." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-crawler-lesen-meine-seiten"],
  },
  {
    slug: "welche-ki-crawler-lesen-meine-seiten",
    question: "Welche KI-Crawler lesen meine Seiten, und sind sie echt?",
    title: "Sehen, welche KI-Crawler deine Seiten lesen, und prüfen, ob sie echt sind",
    summary:
      "GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended und Co. geben sich im User-Agent zu erkennen, und jeder kann diese Zeichenkette fälschen. Agent Tracking zählt sie aus deinem Server-Log und prüft jede Zeile gegen die IP-Bereiche, die der Anbieter veröffentlicht.",
    sections: [
      { h: "Warum das Snippet nicht reicht", p: ["Crawler holen rohes HTML und führen nie ein Script aus, ein browserseitiger Tracker sieht sie gar nicht. Das Server-Log schon, eine Zeile je Anfrage, mit User-Agent und Adresse."] },
      { h: "Schritt 1: das Log schicken", p: ["Auf der Einstellungsseite hochladen oder täglich mit dem API-Token posten. nginx- und Apache-Format combined, roh oder gezippt, ganze Dateien; Zeilen, die älter sind als die neueste bereits importierte, werden übersprungen."], code: LOG, codeLang: "sh" },
      { h: "Schritt 2: Verifikation gegen veröffentlichte Bereiche", p: ["OpenAI, Perplexity, Microsoft, Google und Apple veröffentlichen die Adressbereiche ihrer Crawler. Jede Zeile, die einen davon behauptet, wird geprüft; ein Treffer zählt, ein Fehltreffer landet als unverifiziert. Die Bereiche werden nächtlich aktualisiert.", "Unverifiziert heißt nicht bösartig, aber es heißt, dass die Anfrage nicht von dort kam, wo der Anbieter es sagt, und das sollte man wissen, bevor man sich auf eine robots.txt-Regel verlässt."] },
      { h: "Schritt 3: Bursts", p: ["Ein Agent, mehrere Seiten, wenige Sekunden: das ist ein Assistent, der eine Frage über dich beantwortet, kein Crawl. Die Agenten-Ansicht zählt Bursts je Agent und listet die jüngsten mit ihren Seiten, damit du siehst, welche deiner Seiten ein Assistent für eine Antwort zusammengezogen hat."] },
    ],
    faq: [
      { q: "Welche Crawler stehen auf der Liste?", a: "Die Liste ist öffentlich im Repository und versioniert; die Doku-Seite zeigt die aktuelle Version. Fehlt einer? Pull Request mit der Dokumentation des Anbieters." },
      { q: "Wird die Adresse gespeichert?", a: "Nein. Sie wird während der Verarbeitung genutzt, um Abrufe eines Agenten zu gruppieren und den Bereich zu prüfen, und mit dem Ende der Anfrage verworfen. Die Logdatei wird nicht behalten." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-assistenten-schicken-besucher"],
  },
  {
    slug: "mcp-und-webmcp-tool-aufrufe-erfassen",
    question: "Wie erfasse ich MCP- und WebMCP-Tool-Aufrufe auf meiner Site?",
    title: "MCP- und WebMCP-Tool-Aufrufe auf deiner Site erfassen",
    summary:
      "Wenn deine Seiten Tools über navigator.modelContext oder document.modelContext registrieren oder deklarative Formulare mit toolname bereitstellen, erfasst das Snippet jede Registrierung und jeden Aufruf: Name, Dauer, Erfolg oder Fehlschlag, Fehlerklasse und die Namen der Eingabefelder, nie deren Werte.",
    sections: [
      { h: "Nichts an deinem Code ändern", p: ["Das Snippet umhüllt registerTool und provideContext, bevor dein Code läuft. Registriere Tools wie in der Spezifikation, und sie erscheinen in der Tools-Ansicht. Deklarative Tools, Formulare mit toolname-Attribut, werden beim Absenden erfasst."], code: TOOL, codeLang: "js" },
      { h: "Was die Tools-Ansicht beantwortet", p: ["Je Tool: Aufrufe, Erfolgsquote, mittlere Dauer, die drei häufigsten Fehlermeldungen, ob es deklarativ ist, wann es zuletzt gesehen wurde und ob es je aufgerufen wurde. Das Letzte zählt am meisten: Ein Tool, das niemand aufruft, hat eine Beschreibung, die Agenten nicht verstehen, oder ein Schema, das sie nicht füllen können."] },
      { h: "Feldnamen, nie Werte", p: ["Die Namen der Argument-Felder werden erfasst, damit du siehst, dass Agenten sku schicken, aber nie qty. Die Werte nicht, sodass nichts, was jemand eingetippt hat, den Server erreicht."] },
      { h: "Das Manifest", p: ["Wenn du /.well-known/webmcp veröffentlichst, hasht das Snippet es einmal pro Besuch. Das Dashboard zeigt die letzte Änderung; in Pro und Agency geht eine Mail raus, wenn es sich ändert, was ein Deployment entlarvt, das still ein Tool entfernt hat."] },
    ],
    faq: [
      { q: "Sieht es MCP-Server, die Agenten außerhalb des Browsers aufrufen?", a: "Nein. Es sieht Tools, die in der Seite über die Model-Context-API des Browsers aufgerufen werden. Ein entfernter MCP-Server hat eigene Logs; hier wird die Browserseite gemessen." },
      { q: "Kann ich es ohne Agenten testen?", a: "Ja. Die Demo-Seite hat zwei Tools und einen Simulieren-Knopf; simulierte Aufrufe sind markiert und zählen nie als Agenten." },
    ],
    related: ["sehen-ob-ki-agenten-auf-der-site-kaufen", "verhalten-von-ki-agenten-auf-der-website-messen"],
  },
  {
    slug: "ki-agenten-analytics-ohne-cookie-banner",
    question: "Brauche ich für KI-Agenten-Analytics ein Cookie-Banner?",
    title: "KI-Agenten-Analytics ohne Cookie-Banner: warum es rechtlich hält",
    summary:
      "Die Einwilligung nach ePrivacy gilt dem Speichern oder Auslesen auf dem Endgerät. Agent Tracking speichert dort nichts: kein Cookie, kein Local Storage, kein Fingerprint. Die Sitzungskennung ist ein Hash aus einem täglich neuen Wert, die Adresse wird nicht behalten, und die Daten bleiben auf einem Server in Deutschland unter einem Auftragsverarbeitungsvertrag.",
    sections: [
      { h: "Was eine Einwilligung auslöst, und was nicht", p: ["Die Banner-Pflicht knüpft an den Zugriff auf das Endgerät: Cookies, Local Storage und Techniken, die Gerätemerkmale zu einem Fingerprint auslesen. Ein Script, das Seitenpfad und Referrer-Host schickt und keine Kennung behält, die den Tag überlebt, greift in diesem Sinn nicht auf das Gerät zu. Das ist die Begründung, auf der cookieloses Analytics steht, und sie gilt auch hier."] },
      { h: "Was erfasst wird", p: ["Seitenpfad ohne Query-String; Referrer-Host und utm_source nur, wenn sie einen Assistenten nennen; Toolname, Dauer, Ergebnis, Fehlerklasse und Namen der Eingabefelder; eine Sitzungskennung aus täglichem Zufallswert, Domain, grober Browserklasse und Adresse, gehasht auf 16 Zeichen. Die Adresse selbst wird nicht gespeichert."] },
      { h: "Wo es liegt, und unter welchem Vertrag", p: ["Ein Server in Deutschland. Das Hinzufügen einer Site schließt den Auftragsverarbeitungsvertrag nach Art. 28 DSGVO, der die Unterauftragsverarbeiter nennt, die EU-Standardvertragsklauseln enthält und die Verarbeitung so beschreibt, wie der Code sie macht. Der Quellcode ist öffentlich, ein Datenschutzbeauftragter kann Beschreibung und Umsetzung vergleichen."] },
      { h: "Wenn selbst das zu viel ist", p: ["Betreib es selbst. Die Software ist AGPL-3.0 und installiert sich mit einer Compose-Datei; die Daten verlassen dann nie deinen eigenen Rechner."] },
    ],
    faq: [
      { q: "Ist der Tages-Hash ein personenbezogenes Datum?", a: "Er wird als pseudonymes Datum behandelt und im Auftrag des Site-Betreibers unter dem AVV verarbeitet. Er lässt sich nicht über Tage verknüpfen und nicht auf eine Person auflösen, weil die Eingabe, die das erlauben würde, die Adresse, nicht gespeichert wird." },
      { q: "Ist das Rechtsberatung?", a: "Nein. Es ist eine Beschreibung dessen, was die Software tut, und der Überlegung, der das Design folgt. Deine eigene Bewertung, oder die deines Anwalts, entscheidet." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen"],
  },
];

export function guides(lang: DashLang): Guide[] {
  return lang === "de" ? DE : EN;
}

export function guideBySlug(lang: DashLang, slug: string): Guide | undefined {
  return guides(lang).find((g) => g.slug === slug);
}

/** The same guide in the other language, by position: the two lists are kept in the same order. */
export function counterpart(lang: DashLang, slug: string): Guide | undefined {
  const i = guides(lang).findIndex((g) => g.slug === slug);
  return i < 0 ? undefined : guides(lang === "de" ? "en" : "de")[i];
}
