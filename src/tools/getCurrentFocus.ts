import { z } from "zod";
import { grounding } from "../grounding/index.js";
import { formatForMcp, grounded } from "../rails/confidence.js";

export const getCurrentFocusInputSchema = z.object({}).describe(
  "No input required. Returns the operator's current allocation, active engagements, and the primary vertical wedge in progress.",
);

export type GetCurrentFocusInput = z.infer<typeof getCurrentFocusInputSchema>;

export function getCurrentFocus(_input: GetCurrentFocusInput): string {
  const allocLines = grounding.current_focus.allocation
    .map(
      (a) =>
        `- **${a.role}** at ${a.company} — ${a.arrangement} · since ${a.since}`,
    )
    .join("\n");

  const wedge = grounding.current_focus.active_vertical_wedge;
  const wedgeLine =
    `\n**Active vertical wedge (started ${wedge.started}):** ${wedge.product} · anchor pilot: ${wedge.anchor_pilot} · workspace: \`${wedge.workspace}\`.`;

  const headline = grounding.current_focus.primary_headline;

  const answer = [
    `**Headline:** ${headline}`,
    "\n**Current allocation:**",
    allocLines,
    wedgeLine,
  ].join("\n");

  return formatForMcp(
    grounded(
      answer,
      "high",
      [
        "tounsils.github.io/ResumeIlyes.pdf",
        "C:\\dev\\PROJECTS-INDEX.md",
      ],
    ),
  );
}
