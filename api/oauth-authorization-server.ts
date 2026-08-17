/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 *
 * Served at `/.well-known/oauth-authorization-server` via a rewrite in
 * `vercel.json`. Advertises this server's OAuth capabilities so clients
 * (including Claude's connector directory) can auto-discover the flow.
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
    issuer: issuerUrl,
    authorization_endpoint: endpointUrl(paths.authorize),
    token_endpoint: endpointUrl(paths.token),
    registration_endpoint: endpointUrl(paths.register),

    // What we support
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"], // public clients, PKCE only
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [scope],

    // Metadata for humans + docs
    service_documentation: "https://github.com/tounsils/ask-me-mcp",
    op_policy_uri: "https://github.com/tounsils/ask-me-mcp#the-pattern-the-mcp-server-harness",
  });
}
