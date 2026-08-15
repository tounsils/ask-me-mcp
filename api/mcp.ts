/**
 * Vercel serverless entry point for HTTP transport.
 *
 * Wraps the shared MCP server (`src/server.ts`) in the SDK's streamable-HTTP
 * transport so it works with Anthropic's connector directory and ChatGPT's
 * Apps SDK. Stateless per-request; the server has no long-lived local state.
 *
 * Endpoint (after Vercel deploy): https://<project>.vercel.app/api/mcp
 * Add to Claude via the connector directory once approved, or register manually
 * against local dev at http://localhost:3000/api/mcp.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "../src/server.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless per-request
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    // Log to Vercel; do not leak internal error details to the caller.
    console.error("[ask-me-mcp] handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
}
