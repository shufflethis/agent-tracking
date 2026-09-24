# Organic growth roadmap for agenttracking.co

Baseline: the Search Console sample supplied on 24 September 2026 covers 7–21 September. It shows one click on `agenttrack`; relevant non-brand queries such as `detect gptbot`, `ai crawler tracking`, `chatgpt referral traffic`, and `how do i track ai agent traffic to my website?` have only a few impressions each. This is a discovery signal, not enough data for a trend or a reliable CTR. Do not optimize around unrelated name queries such as `tracking agentur`.

## Editorial position

Own the practical question **"What do AI systems actually do on my website, and how can I measure it?"** Keep four events distinct: AI-referred human visits, crawler or live fetch requests, browser tool calls, and completed goals. A fetch is not evidence of a citation; a referral is not evidence of an autonomous agent action.

Publish one canonical page per search intent. Update an existing guide before creating a competing URL. For new long-form pages, aim for 1,000–2,000 useful words in each language, with original examples, current primary sources and a specific next action. Word count is an editorial range, never a reason to pad a page.

## Topic map and order

| Priority | Cluster | Hub and supporting pages | Search intent |
| --- | --- | --- | --- |
| 1 | AI traffic measurement | `ai-agent-traffic-website-measurement-guide`; GPTBot verification, ChatGPT referrals, crawler traffic, WebMCP analytics | Learn how to measure a real site |
| 2 | Product comparison | Existing GA4/Plausible and Cloudflare comparison pages; AgentOps/LangSmith explainer | Select the right data source or product |
| 3 | Open source and setup | `open-source-ai-agent-analytics-self-hosting`; docs, privacy and plan information | Evaluate free plan versus self-hosting |
| 4 | Trends and research | `ai-traffic-outlook-2026-2027`; public site stats; future opt-in aggregate research | Understand the direction and its uncertainty |
| 5 | Agent actions | WebMCP tool calls, errors, bookings and goals | Improve agent completion |

The new English hubs have German counterparts under `/de/guides/`. The index promotes the hubs. The homepage links to the measurement hub. Supporting pages link back to their hub and to closely related pages. Add contextual links where they help explain a claim; avoid lists of unrelated keyword links.

## Twelve-week publishing cycle

| Weeks | Work | Gate |
| --- | --- | --- |
| 1–2 | Correct existing product comparisons and citation claims; publish measurement, outlook and open-source hubs; check sitemap, hreflang and links. | Build succeeds; every claim has a suitable source or is labeled as an inference. |
| 3–4 | Expand the existing `detect gptbot` and crawler tracking guides with a reproducible log example and verification limits. | Demonstrated on a real test log; 1,000–2,000 useful words per language. |
| 5–6 | Expand the ChatGPT referral guide and one WebMCP action guide. Show what GA4/Plausible already measure and what the snippet adds. | Worked example with distinct visitor, bot and tool counts. |
| 7–8 | Expand Cloudflare AI Crawl Control and AgentOps/LangSmith comparisons using current product docs. | Same comparison dimensions for every product, including strengths and limits. |
| 9–10 | Create one original case study from this site's public stats, only if the sample supports a real conclusion. | State period, raw counts, method and limitations; no fabricated market benchmark. |
| 11–12 | Refresh pages using Search Console query and page reports. Merge overlap, improve titles and examples, add new links based on what readers need next. | Compare 28-day windows; note that small numbers remain noisy. |

## Article workflow

1. Record the user question, intent, audience, target URL and one action the reader should be able to take.
2. Check the existing guide list and Search Console page/query data. Reuse the canonical URL when the intent already exists.
3. Gather primary sources and an original example from code, a test site or permitted aggregate data. Date every changing product claim.
4. Write a direct answer, method, worked example, limits, alternatives and practical next step. Keep 1,000–2,000 words only when the topic warrants them.
5. Add one hub link, two or three relevant sibling links, one suitable product/docs link and direct links to primary sources in the body.
6. Review factual claims, link targets, EN/DE meaning, title, description, canonical, hreflang and article dates.
7. Build, publish, submit new or changed URLs through sitemap/IndexNow where applicable, and inspect indexing.
8. After 4 and 8 weeks, review impressions, clicks, landing pages, referrals and any meaningful goal actions. Improve the page or consolidate overlap before adding another near-duplicate.

## Scorecard

Track by URL and language: Google impressions, clicks, CTR and position; index status; identifiable AI referrals; verified crawler fetches; and tool/goal events where available. Report raw counts beside rates. Review non-brand queries separately from the many lookalike product-name queries. A crawler increase is a machine-traffic observation, not an organic-visitor win.

Use [Google's AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Google's link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), [Plausible's current channel documentation](https://plausible.io/docs/top-referrers), [Cloudflare's current AI Crawl Control docs](https://developers.cloudflare.com/ai-crawl-control/) and [Cloudflare Radar's 2025 review](https://blog.cloudflare.com/radar-2025-year-in-review/) as primary references. Recheck them when updating comparisons or outlooks.
