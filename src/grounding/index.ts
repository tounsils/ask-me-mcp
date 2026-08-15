/**
 * Grounding — the harness queries here; the model never invents.
 *
 * v0 loads pre-extracted structured data from `data.json`.
 * v1 will replace this with a build step that regenerates `data.json`
 * from the source markdown files (resume, PROJECTS-INDEX, offer page).
 */

import data from "./data.json" with { type: "json" };

export type Engagement = {
  slug: string;
  company: string;
  role: string;
  since: string;
  site?: string;
  product: string;
  customers_public?: string[];
  modules?: string[];
  recent_ships?: string[];
  product_details_public?: string[];
  institutional_partners?: string[];
  confidential_note?: string;
  phase_status?: string;
};

export type ReusablePattern = {
  name: string;
  source: string;
  summary: string;
  keywords: string[];
};

export type OfferProduct = {
  slug: string;
  name: string;
  price_usd?: number;
  price_usd_per_month?: number;
  price_usd_per_session?: number;
  term: string;
  refund_clause?: string;
  cap: string;
  summary?: string;
  deliverables?: string[];
};

export type Grounding = typeof data;

export const grounding: Grounding = data;

/**
 * Cheap keyword search over the reusable-patterns catalog.
 * Ranks by keyword hits + summary substring hits.
 */
export function searchPatterns(query: string, limit = 5): ReusablePattern[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = grounding.reusable_patterns.map((p) => {
    const hay = [p.name, p.source, p.summary, ...p.keywords]
      .join(" ")
      .toLowerCase();
    const keywordHits = p.keywords.filter((k) =>
      k.toLowerCase().includes(q) || q.includes(k.toLowerCase()),
    ).length;
    const substringHit = hay.includes(q) ? 1 : 0;
    return { pattern: p, score: keywordHits * 2 + substringHit };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.pattern);
}

export function engagementBySlug(slug: string): Engagement | undefined {
  return grounding.engagements.find(
    (e) => e.slug.toLowerCase() === slug.toLowerCase(),
  );
}
