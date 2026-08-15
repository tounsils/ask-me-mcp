import { z } from "zod";
import { searchPatterns } from "../grounding/index.js";
import { formatForMcp, grounded, refuse } from "../rails/confidence.js";

export const searchReusablePatternsInputSchema = z
  .object({
    query: z
      .string()
      .min(2)
      .max(200)
      .describe(
        "Keyword or short phrase to search the operator's reusable-patterns catalog. Examples: 'mcp', 'encryption', 'retool', 'agents', 'admin console', 'anti-cheat', 'llm evaluation'.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3)
      .describe(
        "Maximum number of patterns to return. Default 3; max 10.",
      ),
  })
  .describe(
    "Search the operator's 12+ reusable engineering patterns catalog by keyword. Returns pattern name, source project, and a short summary.",
  );

export type SearchReusablePatternsInput = z.infer<
  typeof searchReusablePatternsInputSchema
>;

export function searchReusablePatterns(
  input: SearchReusablePatternsInput,
): string {
  const results = searchPatterns(input.query, input.limit);

  if (results.length === 0) {
    return formatForMcp(
      refuse(
        `No patterns matched '${input.query}'. Try broader keywords like 'llm', 'agents', 'saas', 'admin', or 'grounding'.`,
      ),
    );
  }

  const parts: string[] = [
    `## ${results.length} pattern${results.length === 1 ? "" : "s"} matched \"${input.query}\"`,
    "",
  ];

  results.forEach((p, i) => {
    parts.push(`### ${i + 1}. ${p.name}`);
    parts.push(`**Source:** ${p.source}`);
    parts.push(`**Summary:** ${p.summary}`);
    parts.push(`**Keywords:** ${p.keywords.join(", ")}`);
    parts.push("");
  });

  return formatForMcp(
    grounded(
      parts.join("\n").trim(),
      "high",
      ["C:\\dev\\PROJECTS-INDEX.md § Reusable patterns"],
    ),
  );
}
