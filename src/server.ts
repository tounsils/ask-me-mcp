/**
 * ask-me-mcp — persona MCP server.
 *
 * Runs the same server logic whether accessed over stdio (local, Claude Code)
 * or over HTTP (remote, Anthropic connector directory / ChatGPT Apps SDK).
 *
 * Local dev: `npm run dev` (stdio, works with Claude Code and MCP Inspector).
 * Remote:    deployed as a Vercel serverless function at `api/mcp.ts`.
 */

import { pathToFileURL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
  getCurrentFocus,
  getCurrentFocusInputSchema,
} from "./tools/getCurrentFocus.js";
import {
  getEngagementSummary,
  getEngagementSummaryInputSchema,
} from "./tools/getEngagementSummary.js";
import {
  searchReusablePatterns,
  searchReusablePatternsInputSchema,
} from "./tools/searchReusablePatterns.js";
import {
  checkAvailability,
  checkAvailabilityInputSchema,
} from "./tools/checkAvailability.js";
import {
  getOfferDetails,
  getOfferDetailsInputSchema,
} from "./tools/getOfferDetails.js";
import {
  bookDiscoveryCall,
  bookDiscoveryCallInputSchema,
} from "./tools/bookDiscoveryCall.js";

/**
 * Tool contract — 6 typed tools, JSON-schema-strict, nothing free-form.
 * Every handler returns a string with confidence + source metadata appended
 * (see `src/rails/confidence.ts`).
 */
const tools = [
  {
    name: "get_current_focus",
    description:
      "Return the operator's current allocation, active engagements, and the primary vertical wedge in progress.",
    schema: getCurrentFocusInputSchema,
    handler: getCurrentFocus,
  },
  {
    name: "get_engagement_summary",
    description:
      "Describe a specific engagement (NXT Robotics, AIMIA, Hydrostasis, or Digital QR Card) at a public-safe level.",
    schema: getEngagementSummaryInputSchema,
    handler: getEngagementSummary,
  },
  {
    name: "search_reusable_patterns",
    description:
      "Search the operator's 12+ reusable engineering patterns catalog by keyword.",
    schema: searchReusablePatternsInputSchema,
    handler: searchReusablePatterns,
  },
  {
    name: "check_availability",
    description:
      "Return how many Playbook and Retainer slots are currently open, plus the earliest date a new engagement could start.",
    schema: checkAvailabilityInputSchema,
    handler: checkAvailability,
  },
  {
    name: "get_offer_details",
    description:
      "Return the operator's current offer — bundled MCP-Server Playbook + Fractional CTO Retainer (+ session add-on).",
    schema: getOfferDetailsInputSchema,
    handler: getOfferDetails,
  },
  {
    name: "book_discovery_call",
    description:
      "Get instructions and prep guidance for booking a discovery call. Does NOT auto-schedule; hands off to email/LinkedIn. Refuses to negotiate price — that is a human conversation.",
    schema: bookDiscoveryCallInputSchema,
    handler: bookDiscoveryCall,
  },
];

export function createServer(): Server {
  const server = new Server(
    {
      name: "ask-me-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const listed: Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema) as Tool["inputSchema"],
    }));
    return { tools: listed };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Unknown tool: ${req.params.name}. Available tools: ${tools
              .map((t) => t.name)
              .join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    const parsed = tool.schema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Invalid input for ${tool.name}: ${parsed.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const result = (tool.handler as (i: unknown) => string)(parsed.data);
    return {
      content: [{ type: "text" as const, text: result }],
    };
  });

  return server;
}

/**
 * Entry point when run as a local stdio server (Claude Code, MCP Inspector).
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("ask-me-mcp v0.1.0 running on stdio\n");
}

// Only run main() when invoked directly, not when imported by api/mcp.ts.
// Use pathToFileURL so drive-letter paths on Windows resolve to `file:///C:/...`
// (three slashes) rather than the two-slash form we'd get by hand.
const invokedPath = process.argv[1];
const isDirectRun =
  invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href;
if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(`ask-me-mcp fatal: ${String(err)}\n`);
    process.exit(1);
  });
}
