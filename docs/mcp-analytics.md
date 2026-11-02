# ChatGPT and MCP outcome analytics

AgentTracking connects server-reported MCP tool calls with backend-confirmed outcomes. The website script cannot observe remote MCP calls. Use the server integration even before marketplace publication: install the plugin privately, mark those runs as `test`, and inspect the authenticated site's Tools page.

## Integration

Copy `sdk/mcp.ts` into your Node/TypeScript server (source integration; no published npm package is required). In site settings, mint separate tool telemetry and outcome write credentials. Keep both on your server.

```ts
import { MCPTracking } from "./sdk/mcp";

const tracking = new MCPTracking({
  origin: "https://agenttracking.co",
  domain: "example.com",
  toolToken: process.env.TRACKING_TOOL_TOKEN!,
  outcomeToken: process.env.TRACKING_OUTCOME_TOKEN!,
  pluginVersion: "1.0.2",
  environment: "test", // switch explicitly for production
  correlationSecret: process.env.TRACKING_CORRELATION_SECRET,
});

server.registerTool("create_quote_pdf", descriptor,
  tracking.wrap("create_quote_pdf", async (args, extra, context) => {
    const pdf = await createAndSavePdf(args, context);
    await tracking.outcome({
      ...context, receiptId: `created_${context.invocationId}`,
      kind: "pdf_created", occurredAt: Date.now(),
    });
    return { structuredContent: { downloadUrl: pdf.downloadUrl } };
  })
);
```

Use `examples/quote-plugin/example.ts` for calculation and PDF callbacks. Store the opaque invocation context privately with the generated PDF. Report `pdf_fetched` after a successful full GET delivery, with a stable opaque receipt ID of 16–64 characters and the original delivery timestamp. Do not report HEAD, failed or partial transfers as full delivery. Prefetches can still resemble downloads: this confirms delivery, never reading or a particular person.

For reliable delivery, store the receipt, timestamp and unsent state transactionally with the business action and retry the same payload. The wrapper returns a boolean from `outcome`; telemetry is otherwise best effort. It waits up to 800 ms per delivery by default, configurable up to five seconds. Serverless runtimes need this bounded await. Tool results (including MCP `isError`) and thrown errors are preserved even if delivery fails. `onDeliveryError` receives no payload or credentials.

## Measurement

* Tool calls record duration, allowlisted error class, version and environment. No arguments, results, URLs, prompts or raw provider identifiers are sent.
* Optional `openai/session` is HMACed using a site-specific secret of at least 32 characters. This correlates a conversation, not a person. Rotating the secret resets correlation. The SDK does not collect `openai/subject`, location or user-agent metadata.
* The SDK reports actor kind as unknown: metadata alone does not verify ChatGPT or an agent identity.
* Tools are grouped by version. Missing historical versions remain unknown. Test and production reports are displayed separately. Both consume event quota.
* Outcome columns count distinct tool invocations with an exact same-site, same-environment receipt, once per outcome kind. Several downloads of one PDF count as one invocation with a fetch. Failed outcomes do not count as confirmed.
* A shared conversation ID is insufficient to prove calculation → creation → download. The current dashboard confirms creation → delivery using an invocation ID; it does not invent links between separate calls.
* No receipt means unknown. Do not label it a failed conversion or lost sale. Existing overview totals include production server reports only.

The authenticated Tools dashboard is private; this integration adds no public per-call feed. Tool-call records and outcome receipts are raw data: they are deleted after the same 90 days as other raw events, and the Tools views, overview totals and comparisons never reach past that window, whatever the plan's history length. Describe your deployed processing in your privacy notice.

## Demo recording

Run the quote callbacks using `environment: "test"`. Show a successful calculation, a PDF creation, then a successful delivery receipt in the Tools view. Next show a handler that throws and a handler returning `{ isError: true }`. Show the failed count and the version label. Production remains separately selectable. These are controlled tests, not production usage or independent agent verification.

An actual recording and production case study require access to the quote plugin and a running integration; none are fabricated by this example.

## Investigate and compare

The private Tools page lists the latest 50 invocations in the selected receipt-time window. Each detail page authorizes site access and limits data to the account plan window. It shows the server-reported outcome and up to 100 exactly linked receipts. Event and receipt times distinguish late reporting. Conversation matches never introduce inferred steps.

Dashboard warnings use fixed thresholds per tool/version/environment: at least 20 calls, 3 failures/timeouts and 10% failure rate, or at least 20 duration samples with nearest-rank p95 of at least 5,000 ms. Cancelled calls are displayed separately; attempted/unknown calls are included in the total and unknown share. Missing durations are excluded from latency samples. Production warnings also appear in Insights. No notifications are sent externally. These thresholds identify attention-worthy data, not a detected increase against a baseline.

Compare two explicitly selected versions of the same tool in one environment/window. Both sample sizes, technical outcomes, unknown shares, p95 coverage and confirmed outcome counts are displayed. Missing receipts are unknown, and outcome counts are not conversion rates. Changes in traffic, inputs, release timing or coverage can explain differences; no causal improvement is inferred.
