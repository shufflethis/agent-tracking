# SEO and Insights rollout — 2026-09-25

## Shipped scope

- English and German homepages lead with the user decision: inspect a problem, document a fix, retest, and retain evidence. The early name-disambiguation block and illustrative competitor table are removed from the rendered homepage and full machine-readable mirror.
- Two paired guides cover the GEO/AEO measurement playbook and the actual prepared inquiry-test workflow. Existing guides link back to the workflow, setup documentation and related articles.
- The guide language switch now opens the counterpart article. Only URL pairs are passed to the client. Guide contents remain server-rendered.
- Guides have visible breadcrumbs and section navigation. Sitemap entries include reciprocal language alternatives. Home/docs/index dates reflect this release; unchanged legal pages retain their previous dates.
- Several stale guide claims about snippet size, log deduplication and exclusive access to referral signals were corrected.
- Private Insights is available in the overview and its own tab. Rules surface quota gaps, missing/stale browser/log evidence, browser tool errors, verified crawler GETs receiving 403/429, server-reported failed outcomes, missing outcome evidence, latest failed prepared task runs and fixes awaiting retests.
- Evidence links lead to relevant views; Tools and Pages honor the selected period. Reader actions avoid owner-only Settings.
- Findings & fixes shows actual existing before/after run pairs and flags changed conditions. It is site-specific history, not a cross-customer benchmark or a learned recommendation engine.
- Authorized stats API and MCP consumers receive the same localized insights. Public stats do not expose these findings.

## Evidence limits

Priority is a transparent rule order, not an estimate of business impact. Unknown outcomes remain unknown. Legacy and classified error counters are not added together because they overlap. Synthetic-only activity and cancellations do not become failure findings. Only the latest observed run per task/target/mode generates a current test issue; the loader inspects the latest 100 task runs. This is not continuous regression monitoring. Each recorded fix comparison contains one run per state.

## Verification

- 123 tests passed, including new rule, translation, tenant-access and editorial-link checks.
- TypeScript and production build passed.
- Parsed 65 generated HTML documents and checked the public home/docs/guide pages for one H1, self-canonical, page language, existing language counterparts, guide targets, anchors and valid JSON-LD; no errors found.
- Isolated temporary database and local production server verified owner access, anonymous redirect, cross-site denial, English/German Insights, error evidence, overview integration and detail anchors. No customer database was used for the smoke test.

## Ongoing SEO work

After deployment, check public HTTP responses, the new URLs, language pairs and private-route redirects. Submit the updated sitemap URLs via the existing IndexNow integration. IndexNow acceptance is not indexing confirmation.

Search Console indexing, impressions, query performance and Core Web Vitals need their own observed data; this release does not claim improvements in rankings or citations. Review which guide visits lead to a connected data source and a completed test/fix workflow once enough real observations exist. Do not publish conversion percentages or customer benchmarks from the present small pilot.

References used for implementation:

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/appearance/ai-features
