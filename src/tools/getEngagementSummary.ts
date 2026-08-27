import { z } from "zod";
import { engagementBySlug, grounding } from "../grounding/index.js";
import { formatForMcp, grounded, refuse } from "../rails/confidence.js";

export const getEngagementSummaryInputSchema = z
  .object({
    slug: z
      .enum(["nxt-robotics", "aimia", "hydrostasis", "digitalqrcard"])
      .describe(
        "Which engagement to summarize. Use `nxt-robotics` for NXT Robotics, `aimia` for AIMIA, `hydrostasis` for Hydrostasis, `digitalqrcard` for Digital QR Card.",
      ),
  })
  .describe("Describe a specific engagement at a public-safe level of detail.");

export type GetEngagementSummaryInput = z.infer<
  typeof getEngagementSummaryInputSchema
>;

export function getEngagementSummary(input: GetEngagementSummaryInput): string {
  const eng = engagementBySlug(input.slug);
  if (!eng) {
    return formatForMcp(
      refuse(
        `No public engagement with slug '${input.slug}'. Valid slugs: ${grounding.engagements
          .map((e) => e.slug)
          .join(", ")}.`,
      ),
    );
  }

  const parts: string[] = [
    `## ${eng.company} — ${eng.role}`,
    `**Since:** ${eng.since}${eng.site ? ` · **Site:** ${eng.site}` : ""}`,
    "",
    `**Product:** ${eng.product}`,
  ];

  if (eng.customers_public && eng.customers_public.length > 0) {
    parts.push(
      "",
      `**Public customers:** ${eng.customers_public.join(", ")}.`,
    );
  }

  if (eng.institutional_partners && eng.institutional_partners.length > 0) {
    parts.push(
      "",
      `**Institutional partners:** ${eng.institutional_partners.join(", ")}.`,
    );
  }

  if (eng.modules && eng.modules.length > 0) {
    parts.push("", "**Modules I own or contribute to:**");
    eng.modules.forEach((m) => parts.push(`- ${m}`));
  }

  if (eng.product_details_public && eng.product_details_public.length > 0) {
    parts.push("", "**Public product details:**");
    eng.product_details_public.forEach((d) => parts.push(`- ${d}`));
  }

  if (eng.recent_ships && eng.recent_ships.length > 0) {
    parts.push("", "**Recent shipped work:**");
    eng.recent_ships.forEach((s) => parts.push(`- ${s}`));
  }

  if (eng.phase_status) {
    parts.push("", `**Phase status:** ${eng.phase_status}`);
  }

  const disclaimers: string[] = [];
  if (eng.confidential_note) {
    disclaimers.push(eng.confidential_note);
  }

  return formatForMcp(
    grounded(
      parts.join("\n"),
      "high",
      [
        `tounsils.github.io/ResumeIlyes.pdf#${eng.slug}`,
        "tounsils.github.io/resume.html",
      ],
      disclaimers.length > 0 ? disclaimers : undefined,
    ),
  );
}
