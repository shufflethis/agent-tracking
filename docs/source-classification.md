# Source classification (list version 2026-09-25)

`lib/tracking/ai-sources.json` is a list of observable request UA tokens and assistant-specific referral hosts or paths. A UA match is a **claim**. A verified IP range supports the claim where a provider publishes one; it still does not prove that an assistant read, cited or used the response. A referral or exact `utm_source` match indicates a possible assistant-origin visit, not a citation.

Google says [Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) has no separate HTTP UA. Apple says [Applebot-Extended](https://support.apple.com/en-gb/119829) does not crawl pages. Both are `policyTokens`, never request identities. Google's general GoogleOther crawler and ordinary Bingbot are excluded from AI attribution. General corporate hosts such as `openai.com`, `anthropic.com`, `mistral.ai`, `x.ai` and `deepseek.com` are not assistant-specific referrals. Common Crawl and generic indexing services are also excluded from AI attribution.

Matching requires a standalone UA product token, an exact assistant host or an exact path segment. UTM sources match exact listed values or their `.com`/`.ai` host form. Full referrer URLs, query strings and fragments are discarded before classification; for an approved path-specific host only the listed path rule remains. Unknown UAs may become human-reviewed suggestions; suggestions never change the live list, identity evidence or confirmed counts.

Changes to the source list apply to new events. Historical aggregates retain their original classification and source-list version where available. They are not silently rewritten.
