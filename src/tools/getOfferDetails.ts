import { z } from "zod";
import { grounding } from "../grounding/index.js";
import { formatForMcp, grounded, refuse } from "../rails/confidence.js";

export const getOfferDetailsInputSchema = z
  .object({
    product: z
      .enum(["all", "mcp-server-playbook", "fractional-cto-retainer", "session-addon"])
      .default("all")
      .describe(
        "Which product to describe. `all` returns the bundle summary; the others return one product's spec.",
      ),
  })
  .describe(
    "Get the operator's current offer details — bundled MCP-Server Playbook + Fractional CTO Retainer, plus session add-on.",
  );

export type GetOfferDetailsInput = z.infer<typeof getOfferDetailsInputSchema>;

function formatPrice(p: (typeof grounding.offer.products)[number]): string {
  if (p.price_usd) return `$${p.price_usd.toLocaleString()} fixed`;
  if (p.price_usd_per_month) return `$${p.price_usd_per_month.toLocaleString()} / month`;
  if (p.price_usd_per_session) return `$${p.price_usd_per_session.toLocaleString()} / session`;
  return "See operator for pricing.";
}

function formatProduct(p: (typeof grounding.offer.products)[number]): string {
  const parts: string[] = [
    `### ${p.name}`,
    `**Price:** ${formatPrice(p)} · **Term:** ${p.term} · **Cap:** ${p.cap}`,
  ];
  if (p.refund_clause) parts.push(`**Refund clause:** ${p.refund_clause}`);
  if (p.summary) parts.push("", p.summary);
  if (p.deliverables && p.deliverables.length > 0) {
    parts.push("", "**Deliverables:**");
    p.deliverables.forEach((d) => parts.push(`- ${d}`));
  }
  return parts.join("\n");
}

export function getOfferDetails(input: GetOfferDetailsInput): string {
  const o = grounding.offer;

  if (input.product === "all") {
    const parts: string[] = [
      "## Bundled offer — Fractional CTO for AI-heavy startups",
      "",
      `Two products, one operator, one offer page. ${o.products.length} products below. Location: ${o.location}.`,
      "",
    ];
    o.products.forEach((p) => {
      parts.push(formatProduct(p));
      parts.push("");
    });
    parts.push("---");
    parts.push(`**Booking:** ${o.booking_channels.email} · ${o.booking_channels.linkedin}`);

    return formatForMcp(
      grounded(
        parts.join("\n"),
        "high",
        ["C:\\dev\\P-BB-FractionalCTO\\offer-page.md"],
      ),
    );
  }

  const product = o.products.find((p) => p.slug === input.product);
  if (!product) {
    return formatForMcp(
      refuse(
        `Unknown product '${input.product}'. Valid: ${o.products.map((p) => p.slug).join(", ")}, or 'all'.`,
      ),
    );
  }

  return formatForMcp(
    grounded(
      formatProduct(product),
      "high",
      ["C:\\dev\\P-BB-FractionalCTO\\offer-page.md"],
    ),
  );
}
