# Data selection for measurements

The collector stores action type, bounded tool/goal name, site, timestamps,
technical outcome, optional opaque correlation IDs, and a cleaned path. It
does not collect tool arguments, form values, prompts, cookies or browser
storage. Current snippets do not send argument key names; legacy key fields
are discarded by the ingest route. Error messages are reduced to a short
allowlist of error classes. Unknown messages become `Error`.

Paths lose query strings and fragments. The following path prefixes are
redacted by default: `/account`, `/auth`, `/login`, `/password`, `/checkout`,
`/orders`, `/users`, `/profile`, `/booking`. Segments containing unsupported
characters, encoded data, email addresses, long numeric IDs, UUIDs or long
mixed letter/digit IDs become `[redacted]`. The whole path can be redacted
with `TRACKING_REDACT_PATHS`, a comma-separated list of templates:

```text
TRACKING_REDACT_PATHS=/private/:client,/records/*,/medical/**
```

`:name` and `*` match one segment; `**` matches the rest. Configure templates
for site-specific sensitive routes before collecting traffic. The general
segment rules cannot recognize every personal identifier or secret in a URL.
Historic aggregate names are filtered when displayed or exported; an old raw
database may still contain values written by an earlier collector until its
retention period expires. Operators should handle existing databases under
their retention and deletion procedures.
