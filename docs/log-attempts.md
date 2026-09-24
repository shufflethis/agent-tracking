# Server-log access attempts

The nginx/Apache combined-log importer records known agent UA claims as access attempts with HTTP status, result, method, path and resource type. Results: 2xx delivered, 3xx redirect, 401/403 blocked, 429 rate limited, other 4xx client error and 5xx server error. The result describes the HTTP response, not whether an agent understood or cited it.

`GET`, `HEAD` and other methods remain distinct. Resource types (`html`, `pdf`, `json`, `api`, `discovery`, `asset`) are **path guesses** because combined logs do not contain response Content-Type. Content-Type and duration remain null. Query strings and sensitive path segments are removed before persistence. Identity status remains separate from the HTTP result; a 200 with an unverified UA is not an IP-confirmed fetch.

The historical `ai_fetch_verified` counter continues to mean a verified, delivered 2xx HTML GET. Redirects, errors, PDFs, API calls and HEADs appear in the access-attempt table without inflating that counter. Older imports cannot be reconstructed from daily aggregates; the new dimensions start with imports after this migration.
