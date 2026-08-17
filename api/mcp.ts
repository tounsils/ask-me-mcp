/**
 * Vercel serverless entry point.
 *
 * We use the SDK's `WebStandardStreamableHTTPServerTransport` directly and
 * convert Vercel's Node-shaped `req`/`res` to/from Web-standard `Request` /
 * `Response`. This bypasses the SDK's `StreamableHTTPServerTransport`
 * (a Node adapter that internally uses Hono's node-server bridge), which
 * currently fails on Vercel's `VercelResponse` — see
 * `TypeError: outgoing.writeHead is not a function` when the Hono bridge
 * tries to write back to a response object it doesn't fully recognise.
 *
 * Stateless per-request: `sessionIdGenerator: undefined`. The server has no
 * long-lived local state; each request spins up a fresh transport + Server
 * pair, connects, handles, and returns.
 *
 * Endpoint after Vercel deploy: `https://<project>.vercel.app/api/mcp`.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "../src/server.js";

/**
 * Turn a Vercel Node request into a Web-standard `Request`. Vercel already
 * parses JSON bodies for us into `req.body`; we pass it through as
 * `parsedBody` to the transport (per SDK contract) rather than re-serialising
 * it into the Web `Request` body.
 */
function toWebRequest(req: VercelRequest): Request {
  const protocol =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = req.headers["host"] ?? "localhost";
  const url = `${protocol}://${host}${req.url ?? "/api/mcp"}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, String(value));
    }
  }

  // The transport reads the body from `options.parsedBody` when set, so we
  // don't need to attach a body stream to the Request — Vercel's already
  // consumed it. Body-less Request is valid for POST when parsedBody is used.
  return new Request(url, {
    method: req.method ?? "POST",
    headers,
  });
}

/**
 * Copy the SDK's Web-standard `Response` back into Vercel's Node-shaped
 * `res`. Handles JSON bodies, SSE streams, and arbitrary text responses.
 */
async function sendWebResponse(
  webResponse: Response,
  res: VercelResponse,
): Promise<void> {
  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (webResponse.body === null) {
    res.end();
    return;
  }

  // For streaming responses (SSE), pipe the reader chunk-by-chunk. For
  // regular JSON responses this ends up being one chunk followed by close.
  const reader = webResponse.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value !== undefined) {
        res.write(Buffer.from(value));
      }
    }
  } finally {
    reader.releaseLock();
  }
  res.end();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    });
    return;
  }

  try {
    const server = createServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless per-request
    });

    await server.connect(transport);

    const webRequest = toWebRequest(req);
    const webResponse = await transport.handleRequest(webRequest, {
      parsedBody: req.body,
    });

    await sendWebResponse(webResponse, res);
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
