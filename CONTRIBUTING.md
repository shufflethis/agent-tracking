# Contributing

Pull requests are welcome. Keep the snippet under five kilobytes, keep `npm test` and `npm run typecheck` green, and describe in the PR what an agent, a site owner or a self-hoster gains from the change.

Adding an agent or assistant: edit `lib/tracking/ai-sources.json`, bump `SOURCES_VERSION` in `lib/tracking/classify.ts`, and link the vendor's documentation of the user agent or referrer in the PR.

By contributing you agree that your contribution is licensed under the AGPL-3.0 like the rest of the project.
