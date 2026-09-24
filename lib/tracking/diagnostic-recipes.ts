/** Generic, versioned suggestions only. No customer traces or outcome claims live here. */
export const RECIPE_CATALOG_VERSION = 1;
export const DIAGNOSTIC_RECIPES = [
  {
    id: "form_discovery_marker_v1", version: 1, category: "form_discovery",
    title: "Expose a testable inquiry path",
    symptom: "The inquiry form cannot be found by the deterministic browser check.",
    suggestedChange: "On an isolated staging form, add the documented test marker and stable field names.",
    verify: "Run the same inquiry task before and after the change; require a real test-only success marker after local save.",
    evidence: "Two synthetic run IDs, same URL and mode, version IDs, and a documented fix.",
    catalogStatus: "suggestion",
  },
  {
    id: "tool_schema_required_v1", version: 1, category: "tool_schema",
    title: "Clarify required tool inputs",
    symptom: "A tool cannot be called with the published schema.",
    suggestedChange: "Correct the schema so required fields and accepted values match the server implementation.",
    verify: "Run a staging tool invocation with fixed test data and compare the technical outcome after recording the schema version.",
    evidence: "Before/after invocation IDs, schema versions and sanitized error classes.",
    catalogStatus: "suggestion",
  },
  {
    id: "tool_execution_result_v1", version: 1, category: "tool_execution",
    title: "Return a stable technical result",
    symptom: "A remote tool call is reported as failed or timed out.",
    suggestedChange: "Fix the server handler and report one terminal technical outcome for each invocation ID.",
    verify: "Repeat the same isolated task and inspect the new server-side tool receipt and result.",
    evidence: "Before/after run IDs and server invocation IDs; no tool arguments or payload values.",
    catalogStatus: "suggestion",
  },
  {
    id: "outcome_receipt_v1", version: 1, category: "outcome_linkage",
    title: "Confirm the business result on the server",
    symptom: "A browser attempt has no server-confirmed outcome receipt.",
    suggestedChange: "Send a stable receipt only after the staging inquiry is durably saved; retain an outbox for retries.",
    verify: "Check one created receipt, one duplicate retry, and an explicit link to the matching task or invocation ID.",
    evidence: "Site-scoped receipt ID and an accepted server response; actor attribution remains separate.",
    catalogStatus: "suggestion",
  },
] as const;

export function recipeById(id: string) { return DIAGNOSTIC_RECIPES.find((recipe) => recipe.id === id) ?? null; }
