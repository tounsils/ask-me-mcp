/**
 * Anonymous Dynamic Client Registration (RFC 7591) — implemented as a signed
 * JWT that IS the `client_id`. No database, no state.
 *
 * When a client (Claude, ChatGPT, etc.) registers, we hash the presented
 * metadata into a stable client identifier, sign a JWT with the full metadata
 * inside, and return the JWT as the `client_id`. Subsequent auth requests
 * verify the JWT signature to confirm the client_id is one we issued, and
 * pull the redirect_uris etc. right out of the payload.
 *
 * This means:
 *   - No client database to maintain.
 *   - `client_id`s are stable for as long as the metadata is unchanged.
 *   - We can revoke a `client_id` by rotating the JWT signing secret (nuclear
 *     option — invalidates everything issued so far).
 */

import type { JWTPayload } from "jose";
import { signJwt, verifyJwt } from "./jwt.js";
import { ttl } from "./config.js";

export type ClientMetadata = {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  software_id?: string;
  software_version?: string;
};

export type RegisteredClientClaims = JWTPayload & {
  metadata: ClientMetadata;
};

/**
 * Issue a new `client_id` for the given metadata. Idempotent — same input
 * metadata yields the same client_id (up to expiration).
 */
export async function issueClientId(
  metadata: ClientMetadata,
): Promise<string> {
  return signJwt({
    typ: "mcp+client",
    ttlSeconds: ttl.client,
    claims: { metadata },
  });
}

/**
 * Verify a `client_id` and return the metadata it was registered with.
 * Throws if the client_id is not one we issued, or has expired.
 */
export async function verifyClientId(
  clientId: string,
): Promise<ClientMetadata> {
  const { payload } = await verifyJwt<RegisteredClientClaims>(
    clientId,
    "mcp+client",
  );
  return payload.metadata;
}

/**
 * Confirm the requested redirect_uri exactly matches one of the URIs the
 * client registered. OAuth 2.1 requires exact string matching — no prefix
 * matches, no wildcard, no substring.
 */
export function redirectUriIsRegistered(
  metadata: ClientMetadata,
  requestedUri: string,
): boolean {
  return metadata.redirect_uris.includes(requestedUri);
}
