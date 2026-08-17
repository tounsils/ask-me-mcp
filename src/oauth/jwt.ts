/**
 * Thin wrappers around `jose` for HS256 sign + verify. Every OAuth artefact
 * this server issues (client_id, auth_code, access_token, refresh_token) is a
 * signed JWT with a purpose-specific `typ` claim so we never confuse one for
 * another.
 */

import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { issuerUrl, jwtSecret } from "./config.js";

export type JwtType =
  | "mcp+client"
  | "mcp+auth_code"
  | "mcp+access_token"
  | "mcp+refresh_token";

export type SignOpts = {
  typ: JwtType;
  ttlSeconds: number;
  subject?: string;
  audience?: string;
  claims?: Record<string, unknown>;
};

/**
 * Sign a JWT. All tokens issued by this server go through this function so
 * we get consistent iss / iat / exp / typ handling.
 */
export async function signJwt(opts: SignOpts): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // `jti` per RFC 7519 §4.1.7: unique identifier for the token. Guarantees
  // uniqueness across tokens issued within the same second, and gives us a
  // handle for a future server-side revocation list if we ever add one.
  const jti = randomBytes(16).toString("base64url");
  const builder = new SignJWT({
    ...(opts.claims ?? {}),
    typ: opts.typ,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuerUrl)
    .setIssuedAt(now)
    .setExpirationTime(now + opts.ttlSeconds)
    .setJti(jti);
  if (opts.subject) builder.setSubject(opts.subject);
  if (opts.audience) builder.setAudience(opts.audience);
  return builder.sign(jwtSecret());
}

export type VerifyResult<TClaims extends JWTPayload> = {
  payload: TClaims;
  typ: JwtType;
};

/**
 * Verify a JWT and confirm its `typ` claim matches the expected type.
 * Throws on any failure — invalid signature, expired, wrong typ, wrong issuer.
 */
export async function verifyJwt<TClaims extends JWTPayload>(
  token: string,
  expectedTyp: JwtType,
): Promise<VerifyResult<TClaims>> {
  const { payload } = await jwtVerify(token, jwtSecret(), {
    issuer: issuerUrl,
  });
  const typ = payload["typ"];
  if (typ !== expectedTyp) {
    throw new Error(
      `JWT typ mismatch: expected '${expectedTyp}', got '${String(typ)}'`,
    );
  }
  return { payload: payload as TClaims, typ: typ as JwtType };
}
