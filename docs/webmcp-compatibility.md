# WebMCP capture and browser support (checked 25 September 2026)

The [WebMCP community draft](https://webmachinelearning.github.io/webmcp/) defines
`document.modelContext.registerTool()`, `getTools()`, `executeTool()` and
`toolchange`, `toolactivated`, `toolcancel` events. It does not define
`provideContext()`. Declarative execution details are still draft work.

| Environment | Availability evidenced by primary source | Capture in Agent Tracking |
| --- | --- | --- |
| Chrome | [Origin trial from Chrome 149; local development flag](https://developer.chrome.com/docs/ai/webmcp) | The core snippet wraps registrations it observes and can list currently exposed same-origin tools. |
| Edge | [WebMCP origin trial listed in Edge 150 release notes](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/release-notes/150) | Feature-detected only; no stable default support assumed. |
| Firefox, Safari | No confirmed implementation in the primary sources checked | `document.modelContext` absent means unsupported, not zero tool calls. |
| Older experimental implementations | `navigator.modelContext` is checked for compatibility | This is not evidence of current standard support. |

The core snippet instruments an API already present when it runs and polls for
one that appears during the first 15 seconds. `getTools()` can reveal an
existing registration, but cannot give this observer the original execute
callback or earlier invocation history. Such tools are marked **discovered**;
their past call count is unknown. The core records successful registrations
seen after instrumentation, changes/removals from `toolchange`, and removal
when an observed registration's abort signal fires. An observed registration
is not proof that an agent called it.
When the browser exposes `toolactivated` and `toolcancel`, their tool names are
stored as separate lifecycle signals. The draft events have no invocation ID,
so concurrent activations of the same tool cannot be safely paired with a
particular cancellation or wrapper result. They are not added to the tool-call
total and cannot establish a business outcome.

For applications that register tools before the deferred core snippet runs,
load the optional 2 KB helper synchronously before the application code:

```html
<script data-domain="example.com" src="https://agenttracking.co/agent-webmcp-sdk.js"></script>
<script defer data-domain="example.com" src="https://agenttracking.co/agent.js"></script>
<script>
  if (document.modelContext) {
    AgentTrackingWebMCP.registerTool({
      name: "search",
      description: "Search this site",
      execute: async (input, context) => searchSite(input, context)
    });
  }
</script>
```

The helper returns the original `registerTool()` result and preserves tool
arguments, receiver, return values and errors. It sends technical lifecycle
observations only. It has no credentials and does not prove agent identity or
business completion. If `modelContext` is absent, `registerTool` throws an
explicit unsupported error. A page may instead call `wrapTool(tool)` and pass
the result to its own registration logic.
