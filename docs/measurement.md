# Measurement contract

Version 2 separates the source of an observation, the evidence for an actor's
identity, and the outcome of an action. See `lib/tracking/measurement.ts` for the
typed contract. The fields are deliberately nullable where this installation
cannot verify a fact.

The browser sends a batch as `{ "d": "example.com", "v": 2, "e": [...] }`.
Each event needs a stable, opaque `id` of 16–64 URL-safe characters. Reuse the
same ID when retrying the same observation; use a new ID for a new observation.
The older version 1 batch remains accepted. Legacy events have no reliable
idempotency key and cannot be deduplicated across retries. IDs are unique per
site and transport. Receipts are retained for the raw event retention period
(currently 90 days). A retry after that window is outside the deduplication
guarantee.

An event may include `at` (client time in milliseconds), `tid` (task ID), `iid`
(invocation ID), `pid` (parent ID), `rid` (release ID), `tv` (tool version) and
`sv` (tool schema version). The server also stores its own receipt time. A client
time more than one day from receipt time is replaced with receipt time. None of
these identifiers authenticate an actor or a business outcome. Unknown fields
such as `verified`, `server_confirmed` or `transport` have no authority.

For browser events the server records `transport=browser`. A matched user-agent
string is a claim (`identityStatus=claimed`), even when the name resembles a
vendor. Without another verified signal the status remains `unknown` or
`claimed`. A browser event's business outcome remains `unconfirmed`.
`technicalOutcome=completed` means the snippet reported that execution returned;
it does not mean that a booking or sale succeeded. A referral source records the
identified origin of a visit and does not imply that an agent used the page.

Current daily counters predate this contract. They retain their historical
meaning until an explicit versioned reporting migration is implemented. A
historical `conversion` counter cannot be treated as a confirmed agent sale.

The old `conversion` daily counter and API field retain their original meaning:
an unverified browser goal signal. Reports expose it as `legacyGoalSignals` and
add `confirmedBusinessOutcomes` and `confirmedAgentOutcomes` separately. Existing
aggregates cannot be reconstructed or promoted after the fact. The CSV export
adds a definition column; JSON and MCP responses include `reportingDefinitions`.
The `interactions` field retains its legacy sum for API compatibility and is
explicitly described as overlapping activity signals, including these goals.
Compare only periods with the same definition; the future confirmed-outcome
series starts from its own first accepted server event.

Browser beacons use a bounded 32 KiB request reader and are public observations.
The request Origin is a same-site filter, not an authentication factor: direct
clients can set that header. The platform origin has no exception for customer
sites. Bad or unattributable requests enter a private internal aggregate; rate,
quota and write drops for a known site are visible to its owner in the private
stats API and dashboard. Log uploads are bounded before and after decompression.
The current per-IP rate limiter is local to the single Node process; deployments
with multiple workers require a shared limiter before claiming global limits.

Protocol v2 sends `goal_attempt` for a browser goal action and `form_attempt`
for a form marked with `toolname`. Neither is a confirmed conversion or an
authenticated agent invocation. A cancelled form submit is marked cancelled;
otherwise it remains an attempted form action with unknown final result. Old
snippets that send `agent_conversion` remain accepted into the separate legacy
counter. Goal attempts and legacy signals are separate series and must not be
combined into a confirmed-outcome rate.

Tool wrappers report one terminal technical state: `completed` when a function
returns or its Promise fulfills, `failed` on throw/rejection, `cancelled` on
AbortSignal/AbortError, or `timed_out` after 60 seconds without an outcome.
The original return value or error continues to the caller. Fulfilling with
`{ok:false}` is still only technical completion; no arbitrary return object
can confirm a booking. A valid server-side completion integration must supply
business evidence independently. Historic tool calls have no reliable
terminal-state breakdown and appear as unknown in the new series.

Browser API support and the early-registration helper are documented in
[`webmcp-compatibility.md`](./webmcp-compatibility.md).
