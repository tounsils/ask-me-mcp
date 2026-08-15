import { z } from "zod";
import { grounding } from "../grounding/index.js";
import { formatForMcp, grounded } from "../rails/confidence.js";

export const bookDiscoveryCallInputSchema = z
  .object({
    prospect_context: z
      .string()
      .min(10)
      .max(1000)
      .describe(
        "A brief description of who you are and what you'd like to discuss. Company / stage / stack / the one architecture question or hire decision you're stuck on. This helps the operator prep for the call — the tool does NOT actually book the call itself; it hands back email + LinkedIn to close the loop over a channel the operator controls.",
      ),
  })
  .describe(
    "Ask for a discovery call. Does NOT auto-schedule. Returns booking channels and prep guidance. Explicitly refuses to negotiate price — that's a human conversation.",
  );

export type BookDiscoveryCallInput = z.infer<
  typeof bookDiscoveryCallInputSchema
>;

export function bookDiscoveryCall(input: BookDiscoveryCallInput): string {
  const b = grounding.offer.booking_channels;

  const parts: string[] = [
    "## To book a discovery call",
    "",
    "The operator does not auto-book through this MCP server — every discovery call is a human handshake first. Two paths:",
    "",
    `1. **Email:** [${b.email}](mailto:${b.email}) — subject line 'Discovery call — [your company] — [MCP-Playbook or Retainer]'. Paste the context below into the body.`,
    `2. **LinkedIn DM:** [${b.linkedin}](${b.linkedin}) — same subject / body.`,
    "",
    "**Prospect context you provided (paste into your email/DM):**",
    "",
    "```",
    input.prospect_context,
    "```",
    "",
    "**What to expect on the call (30 minutes):**",
    "- Minutes 0–5: you talk (what you're building, what's the current headache).",
    "- Minutes 5–15: qualifying questions.",
    "- Minutes 15–25: operator's take + one specific reusable-pattern that applies to your situation.",
    "- Minutes 25–30: close or don't. First two founders to reply this week get the free call.",
    "",
    "**What the operator will NOT do on the call:**",
    "- Negotiate price. The Playbook is $12k fixed; the Retainer is $3.5k/mo. Take it or don't.",
    "- Sign a full-time CTO deal for a fundraise (that's a different product).",
    "- Give you a quote by end of call — a scoping doc arrives within 2 business days after the call if it's a fit.",
  ];

  return formatForMcp(
    grounded(
      parts.join("\n"),
      "high",
      [
        "C:\\dev\\P-BB-FractionalCTO\\offer-page.md",
        "C:\\dev\\P-Ideation\\bb-fractional-cto.md § Discovery-call script",
      ],
    ),
  );
}
