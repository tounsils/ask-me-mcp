/**
 * Rails: every response carries a confidence label and a source citation.
 * The model never invents; if the grounding data doesn't say it, we don't say it.
 */

export type Confidence = "high" | "medium" | "low" | "unknown";

export type GroundedResponse = {
  answer: string;
  confidence: Confidence;
  sources: string[];
  disclaimers?: string[];
};

/**
 * Wraps an answer with a confidence label + source citation.
 * Prefer `high` for answers directly quoted from the grounding data.
 * Prefer `medium` for answers assembled from multiple grounding fields.
 * Prefer `low` for answers that required interpretation.
 * Use `unknown` and set the disclaimer when the question can't be answered
 * from the grounding data.
 */
export function grounded(
  answer: string,
  confidence: Confidence,
  sources: string[],
  disclaimers?: string[],
): GroundedResponse {
  return { answer, confidence, sources, disclaimers };
}

/**
 * Standard refusal for out-of-scope questions (pricing negotiation,
 * confidential client details, personal opinions the operator hasn't
 * publicly shared).
 */
export function refuse(reason: string, handoff?: string): GroundedResponse {
  return {
    answer:
      handoff ??
      "I don't have that information in the operator's public grounding data. Try email at tounsils@gmail.com for direct questions.",
    confidence: "unknown",
    sources: [],
    disclaimers: [reason],
  };
}

/**
 * Format a GroundedResponse for MCP tool output.
 * Includes source list + disclaimers so the calling model can display them.
 */
export function formatForMcp(r: GroundedResponse): string {
  const parts: string[] = [r.answer.trim()];
  parts.push(`\n\n---\n**Confidence:** ${r.confidence}`);
  if (r.sources.length > 0) {
    parts.push(`**Sources:** ${r.sources.join(", ")}`);
  }
  if (r.disclaimers && r.disclaimers.length > 0) {
    parts.push(`**Note:** ${r.disclaimers.join("; ")}`);
  }
  return parts.join("\n");
}
