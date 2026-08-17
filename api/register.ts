/**
 * RFC 7591 — OAuth 2.0 Dynamic Client Registration Protocol.
 *
 * Accepts a client-metadata JSON POST, returns a `client_id` (which is itself
 * a signed JWT containing the metadata — no server-side storage). Every
 * client that asks gets registered. This is anonymous DCR; for real user
 * accounts, gate this endpoint behind an initial-access-token check.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueClientId, type ClientMetadata } from "../src/oauth/clientRegistry.js";
import { ttl } from "../src/oauth/config.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = req.body as Partial<ClientMetadata> | undefined;
  if (!body || typeof body !== "object") {
    res
      .status(400)
      .json({ error: "invalid_client_metadata", error_description: "Missing or non-JSON body" });
    return;
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0) {
    res.status(400).json({
      error: "invalid_redirect_uri",
      error_description: "`redirect_uris` must be a non-empty array",
    });
    return;
  }

  // Constrain accepted grant / response types to the ones we implement.
  const grantTypes = Array.isArray(body.grant_types)
    ? body.grant_types.filter((g) =>
        ["authorization_code", "refresh_token"].includes(g),
      )
    : ["authorization_code", "refresh_token"];
  const responseTypes = Array.isArray(body.response_types)
    ? body.response_types.filter((r) => r === "code")
    : ["code"];

  const metadata: ClientMetadata = {
    client_name: body.client_name,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: "none", // public clients, PKCE-only
    scope: "mcp:read",
    software_id: body.software_id,
    software_version: body.software_version,
  };

  try {
    const clientId = await issueClientId(metadata);
    const nowSec = Math.floor(Date.now() / 1000);

    // RFC 7591 §3.2.1 response shape.
    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: nowSec,
      client_secret_expires_at: 0, // public client, no secret
      client_name: metadata.client_name,
      redirect_uris: metadata.redirect_uris,
      grant_types: metadata.grant_types,
      response_types: metadata.response_types,
      token_endpoint_auth_method: metadata.token_endpoint_auth_method,
      scope: metadata.scope,
      // Advisory only — our client_ids are actually valid for `ttl.client`
      // seconds because they're signed JWTs. Clients don't need to know.
      client_id_expires_at: nowSec + ttl.client,
    });
  } catch (err) {
    console.error("[ask-me-mcp] /register error:", err);
    res.status(500).json({
      error: "server_error",
      error_description: "Could not issue client_id",
    });
  }
}
