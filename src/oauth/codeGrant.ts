/**
 * Authorization code + PKCE (S256) issue + verify + token exchange helpers.
 *
 * Auth codes and access/refresh tokens are all signed JWTs. Single-use
 * enforcement for auth codes is best-effort: we set a 60-second TTL and rely
 * on the client_id + code_challenge binding + `jti` (JWT ID) uniqueness in
 * the payload. A stricter implementation would maintain a used-code set;
 * for a stateless serverless setup, the 60-second window is the tradeoff.
 */

import { createHash } from "node:crypto";
import type { JWTPayload } from "jose";
import { signJwt, verifyJwt } from "./jwt.js";
import { scope, ttl } from "./config.js";

export type AuthCodeClaims = JWTPayload & {
  client_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: "S256";
};

export type AccessTokenClaims = JWTPayload & {
  client_id: string;
  scope: string;
};

export type RefreshTokenClaims = JWTPayload & {
  client_id: string;
  scope: string;
};

/**
 * Compute the S256 code challenge from a verifier per RFC 7636.
 *   base64url( SHA256( ASCII(code_verifier) ) )
 */
export function computeS256Challenge(codeVerifier: string): string {
  const hash = createHash("sha256").update(codeVerifier, "ascii").digest();
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Issue a signed auth code JWT for the given client + PKCE challenge.
 */
export async function issueAuthCode(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
): Promise<string> {
  return signJwt({
    typ: "mcp+auth_code",
    ttlSeconds: ttl.authCode,
    subject: clientId,
    claims: {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    },
  });
}

/**
 * Verify an auth code and confirm the presented PKCE verifier matches the
 * challenge stored in the code. Also validates client_id + redirect_uri.
 * Throws on any mismatch.
 */
export async function verifyAuthCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<AuthCodeClaims> {
  const { payload } = await verifyJwt<AuthCodeClaims>(
    params.code,
    "mcp+auth_code",
  );

  if (payload.client_id !== params.clientId) {
    throw new Error("Auth code client_id mismatch");
  }
  if (payload.redirect_uri !== params.redirectUri) {
    throw new Error("Auth code redirect_uri mismatch");
  }

  const computed = computeS256Challenge(params.codeVerifier);
  if (computed !== payload.code_challenge) {
    throw new Error("PKCE verifier does not match code_challenge");
  }

  return payload;
}

export async function issueAccessToken(clientId: string): Promise<string> {
  return signJwt({
    typ: "mcp+access_token",
    ttlSeconds: ttl.accessToken,
    subject: clientId,
    claims: { client_id: clientId, scope },
  });
}

export async function issueRefreshToken(clientId: string): Promise<string> {
  return signJwt({
    typ: "mcp+refresh_token",
    ttlSeconds: ttl.refreshToken,
    subject: clientId,
    claims: { client_id: clientId, scope },
  });
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const { payload } = await verifyJwt<AccessTokenClaims>(
    token,
    "mcp+access_token",
  );
  return payload;
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenClaims> {
  const { payload } = await verifyJwt<RefreshTokenClaims>(
    token,
    "mcp+refresh_token",
  );
  return payload;
}
