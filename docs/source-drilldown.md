# Private source drill-down

The Overview top-source list and Agents table link to `/app/{domain}/agents/{kind}:{source}?days=30`, where kind is `referral` or `fetch`. Site-owner or granted reader access is required. Pages remain noindex.

The detail view shows source-specific daily counters, retained page observations, up to 50 recent events, and separate origin-log access details for crawler identities. Page paths are redacted again before output and merged if they collapse to the same safe label. Unredacted page paths link to the tracked website. Simulated and future raw events are excluded. Domain and source selectors use bound SQL parameters.

Historical crawler claims are not promoted to verified requests. Removed source identifiers remain inspectable if the site has historical data. Empty shorter periods remain valid views. Berlin calendar boundaries are used consistently, including daylight-saving transitions.

Raw events expire after the existing retention period. Daily counters and retained details therefore need not match. Browser and log observations may overlap; the view never adds them into a unique visitor count.

Original assistant questions, conversation URLs, exact referral/UTM values and plugin/custom-GPT/connector identity are not available in the stored dataset. The interface labels those gaps explicitly. It does not reconstruct prompts or join sessions to infer users, purchases or conversations. No new visitor fields are collected and no database migration is introduced.

Validation: 127 tests passed; production build passed; an isolated temporary database and production server checked both languages, source links, count and path rendering, anonymous redirects and cross-site denial.
