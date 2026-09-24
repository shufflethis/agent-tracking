# Installation and measurement status

“Snippet verified” means a homepage check found `agent.js` with the registered `data-domain`. It is an installation result, not proof that a beacon was delivered or a tool called. Each check writes a separate UUID test ID and a bounded result code to `site_checks`, outside production counters and event usage. The last successful check (`verified_at`) remains available after a failed recheck; the latest attempt and its result are shown separately.

Since status tracking began, the site records the first and last accepted beacon and the latest real tool call. Existing daily aggregates cannot reliably reconstruct an earlier first beacon, so a blank field means “not observed since this status was introduced.” Log source identity and freshness are separate. A server-confirmed completion source remains unconfigured until the completion integration is connected.
