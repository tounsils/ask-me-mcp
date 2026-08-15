import { z } from "zod";
import { grounding } from "../grounding/index.js";
import { formatForMcp, grounded } from "../rails/confidence.js";

export const checkAvailabilityInputSchema = z.object({}).describe(
  "No input required. Returns how many Playbook and Retainer slots are currently open, plus the earliest date a new engagement could start.",
);

export type CheckAvailabilityInput = z.infer<
  typeof checkAvailabilityInputSchema
>;

export function checkAvailability(_input: CheckAvailabilityInput): string {
  const a = grounding.availability;

  const parts: string[] = [
    `## Availability`,
    "",
    `- **MCP-Server Playbook:** ${a.playbook_slots_open} of ${a.playbook_slots_total} slot${a.playbook_slots_total === 1 ? "" : "s"} open.`,
    `- **Fractional CTO Retainer:** ${a.retainer_slots_open} of ${a.retainer_slots_total} slot${a.retainer_slots_total === 1 ? "" : "s"} open.`,
    `- **Next open start date:** ${a.next_open_date}.`,
    "",
    `**Cap:** ${a.notes_public}`,
  ];

  return formatForMcp(
    grounded(
      parts.join("\n"),
      "high",
      [
        "C:\\dev\\P-BB-FractionalCTO\\offer-page.md",
        "C:\\dev\\P-Ideation\\bb-fractional-cto.md § Delivery-capacity math",
      ],
    ),
  );
}
