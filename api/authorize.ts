/**
 * Authorization endpoint. Auto-approves every request — no user consent
 * screen — because ask-me-mcp serves only public data and has no per-user
 * state. Issues an auth code JWT and 302-redirects back to the client with
 * `code=` + `state=`.
 *
 * See docs/oauth-flow.md § Swapping anonymous grants for upstream identity
 * for how to add a real consent screen + user identity.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  redirectUriIsRegistered,
  verifyClientId,
} from "../src/oauth/clientRegistry.js";
import { issueAuthCode } from "../src/oauth/codeGrant.js";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const q = req.query;
  const responseType = q["response_type"];
  const clientId = q["client_id"];
  const redirectUri = q["redirect_uri"];
  const state = q["state"];
  const codeChallenge = q["code_challenge"];
  const codeChallengeMethod = q["code_challenge_method"];
  const requestedScope = q["scope"];

  // OAuth 2.1 requires: response_type=code, PKCE S256 for public clients,
  // exact-match registered redirect_uri.
  if (responseType !== "code") {
    res.status(400).json({
      error: "unsupported_response_type",
      error_description: "Only `response_type=code` is supported",
    });
    return;
  }
  if (!isNonEmptyString(clientId)) {
    res.status(400).json({ error: "invalid_request", error_description: "Missing client_id" });
    return;
  }
  if (!isNonEmptyString(redirectUri)) {
    res.status(400).json({ error: "invalid_request", error_description: "Missing redirect_uri" });
    return;
  }
  if (!isNonEmptyString(codeChallenge)) {
    res.status(400).json({
      error: "invalid_request",
      error_description: "PKCE code_challenge is required",
    });
    return;
  }
  if (codeChallengeMethod !== "S256") {
    res.status(400).json({
      error: "invalid_request",
      error_description: "PKCE code_challenge_method must be S256",
    });
    return;
  }
  if (isNonEmptyString(requestedScope) && requestedScope !== "mcp:read") {
    res.status(400).json({
      error: "invalid_scope",
      error_description: "Only scope=mcp:read is supported",
    });
    return;
  }

  let metadata;
  try {
    metadata = await verifyClientId(clientId);
  } catch {
    res.status(400).json({
      error: "invalid_client",
      error_description: "Unknown or expired client_id",
    });
    return;
  }

  if (!redirectUriIsRegistered(metadata, redirectUri)) {
    res.status(400).json({
      error: "invalid_request",
      error_description: "redirect_uri does not match a registered URI",
    });
    return;
  }

  let code: string;
  try {
    code = await issueAuthCode(clientId, redirectUri, codeChallenge);
  } catch (err) {
    console.error("[ask-me-mcp] /authorize issueAuthCode error:", err);
    res.status(500).json({ error: "server_error" });
    return;
  }

  // Auto-approve. Redirect back to the client with code + state.
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (isNonEmptyString(state)) url.searchParams.set("state", state);

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, url.toString());
}
