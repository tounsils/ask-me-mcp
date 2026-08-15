/**
 * Eval runner — replays the eval corpus against the local server.
 *
 * v0: invokes tool handlers directly (in-process). v1 will optionally hit an
 * HTTP endpoint so the same corpus certifies a deployed Vercel server.
 *
 * Usage: `npm run eval`
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { getCurrentFocus } from "../src/tools/getCurrentFocus.js";
import { getEngagementSummary } from "../src/tools/getEngagementSummary.js";
import { searchReusablePatterns } from "../src/tools/searchReusablePatterns.js";
import { checkAvailability } from "../src/tools/checkAvailability.js";
import { getOfferDetails } from "../src/tools/getOfferDetails.js";
import { bookDiscoveryCall } from "../src/tools/bookDiscoveryCall.js";

type Case = {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  expected_substrings?: string[];
  must_not_include?: string[];
  must_include_metadata?: string[];
  notes?: string;
};

type Corpus = {
  meta: { pass_threshold_pct: number };
  cases: Case[];
};

const handlers: Record<string, (input: unknown) => string> = {
  get_current_focus: getCurrentFocus as (i: unknown) => string,
  get_engagement_summary: getEngagementSummary as (i: unknown) => string,
  search_reusable_patterns: searchReusablePatterns as (i: unknown) => string,
  check_availability: checkAvailability as (i: unknown) => string,
  get_offer_details: getOfferDetails as (i: unknown) => string,
  book_discovery_call: bookDiscoveryCall as (i: unknown) => string,
};

function loadCorpus(): Corpus {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, "corpus.json"), "utf-8");
  return JSON.parse(raw) as Corpus;
}

type Result = {
  id: string;
  passed: boolean;
  reason?: string;
};

function runCase(c: Case): Result {
  const handler = handlers[c.tool];
  if (!handler) {
    return { id: c.id, passed: false, reason: `Unknown tool: ${c.tool}` };
  }

  let output: string;
  try {
    output = handler(c.input);
  } catch (err) {
    return { id: c.id, passed: false, reason: `Handler threw: ${String(err)}` };
  }

  const missing = (c.expected_substrings ?? []).filter(
    (s) => !output.includes(s),
  );
  if (missing.length > 0) {
    return {
      id: c.id,
      passed: false,
      reason: `Missing expected substrings: ${missing.join(", ")}`,
    };
  }

  const present = (c.must_not_include ?? []).filter((s) => output.includes(s));
  if (present.length > 0) {
    return {
      id: c.id,
      passed: false,
      reason: `Contained forbidden substrings: ${present.join(", ")}`,
    };
  }

  const missingMeta = (c.must_include_metadata ?? []).filter(
    (s) => !output.includes(s),
  );
  if (missingMeta.length > 0) {
    return {
      id: c.id,
      passed: false,
      reason: `Missing metadata: ${missingMeta.join(", ")}`,
    };
  }

  return { id: c.id, passed: true };
}

function main(): void {
  const corpus = loadCorpus();
  const results = corpus.cases.map(runCase);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const passPct = (passed / total) * 100;

  process.stdout.write(`\nask-me-mcp eval — ${passed}/${total} cases passed (${passPct.toFixed(1)}%)\n\n`);

  results.forEach((r) => {
    const icon = r.passed ? "PASS" : "FAIL";
    const line = `  [${icon}] ${r.id}${r.reason ? " — " + r.reason : ""}\n`;
    process.stdout.write(line);
  });

  process.stdout.write("\n");

  if (passPct < corpus.meta.pass_threshold_pct) {
    process.stdout.write(
      `Below threshold (${corpus.meta.pass_threshold_pct}%). Ships or nothing ships — this is nothing.\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`Above threshold. Certified.\n`);
}

main();
