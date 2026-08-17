/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 *
 * Served at `/.well-known/oauth-protected-resource` via a rewrite in
 * `vercel.json`. Tells MCP clients how to obtain a token for this resource:
 * it points at the authorization server (this same origin) and lists the
 * one scope we understand.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { endpointUrl, issuerUrl, paths, scope } from "../src/oauth/config.js";

export default function handler(
  _req: VercelRequest,
  res: VercelResponse,
): void {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    resource: endpointUrl(paths.mcp),
    authorization_servers: [issuerUrl],
    scopes_supported: [scope],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://github.com/tounsils/ask-me-mcp",
  });
}
