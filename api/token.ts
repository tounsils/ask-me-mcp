/**
 * Token endpoint. Handles two grant types:
 *   - authorization_code (with PKCE S256 verification)
 *   - refresh_token (rotates the refresh token on every use)
 *
 * Response shape per OAuth 2.1 / RFC 6749 §5.1.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyClientId } from "../src/oauth/clientRegistry.js";
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAuthCode,
  verifyRefreshToken,
} from "../src/oauth/codeGrant.js";
import { scope, ttl } from "../src/oauth/config.js";

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

/**
 * Vercel usually parses `application/x-www-form-urlencoded` into `req.body`
 * as an object. Handle both that AND a raw-string fallback just in case.
 */
function readForm(req: VercelRequest): Record<string, string> {
  const b = req.body;
  if (b && typeof b === "object" && !Array.isArray(b)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  if (typeof b === "string") {
    return Object.fromEntries(new URLSearchParams(b).entries());
  }
  return {};
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

async function tokenResponse(clientId: string): Promise<TokenResponse> {
  const [accessToken, refreshToken] = await Promise.all([
    issueAccessToken(clientId),
    issueRefreshToken(clientId),
  ]);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ttl.accessToken,
    refresh_token: refreshToken,
    scope,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "invalid_request" });
    return;
  }

  const form = readForm(req);
  const grantType = form["grant_type"];

  if (grantType === "authorization_code") {
    const code = form["code"];
    const redirectUri = form["redirect_uri"];
    const clientId = form["client_id"];
    const codeVerifier = form["code_verifier"];

    if (!isNonEmpty(code) || !isNonEmpty(redirectUri) || !isNonEmpty(clientId) || !isNonEmpty(codeVerifier)) {
      res.status(400).json({
        error: "invalid_request",
        error_description:
          "authorization_code grant requires code, redirect_uri, client_id, code_verifier",
      });
      return;
    }

    try {
      await verifyClientId(clientId);
    } catch {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    try {
      await verifyAuthCode({ code, clientId, redirectUri, codeVerifier });
    } catch (err) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: (err as Error).message,
      });
      return;
    }

    res.status(200).json(await tokenResponse(clientId));
    return;
  }

  if (grantType === "refresh_token") {
    const refreshToken = form["refresh_token"];
    const clientId = form["client_id"];

    if (!isNonEmpty(refreshToken) || !isNonEmpty(clientId)) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "refresh_token grant requires refresh_token, client_id",
      });
      return;
    }

    try {
      await verifyClientId(clientId);
    } catch {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    let claims;
    try {
      claims = await verifyRefreshToken(refreshToken);
    } catch (err) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: (err as Error).message,
      });
      return;
    }

    if (claims.client_id !== clientId) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: "refresh_token client_id mismatch",
      });
      return;
    }

    res.status(200).json(await tokenResponse(clientId));
    return;
  }

  res.status(400).json({
    error: "unsupported_grant_type",
    error_description: `Grant type '${String(grantType)}' not supported`,
  });
}
