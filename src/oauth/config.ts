/**
 * OAuth 2.1 server configuration for ask-me-mcp.
 *
 * See `docs/oauth-flow.md` for the full architecture. Short version:
 *   - Anonymous DCR — every client gets registered on first ask, no user account.
 *   - Every client_id / auth_code / access_token / refresh_token is a signed JWT.
 *     Zero storage. Vercel serverless is stateless — this fits perfectly.
 *   - PKCE S256 required.
 *   - Single scope `mcp:read` covers everything (all data is public).
 *
 * To bind tokens to a real user identity (GitHub, Google, magic-link) later,
 * see `docs/oauth-flow.md § Swapping anonymous grants for upstream identity`.
 */

/**
 * Public canonical URL of this MCP server. Everything in the OAuth metadata
 * references this. Override with `MCP_ISSUER_URL` in Vercel env vars if the
 * deployment moves to a custom domain.
 */
export const issuerUrl =
  process.env["MCP_ISSUER_URL"] ?? "https://ask-me-mcp-xi.vercel.app";

/**
 * Signing secret for all JWTs (HS256). Set via `vercel env add MCP_JWT_SECRET`.
 * A missing secret is a fatal misconfiguration — the OAuth flow can't proceed
 * safely without one, so we throw rather than fall back to something guessable.
 */
export function jwtSecret(): Uint8Array {
  const raw = process.env["MCP_JWT_SECRET"];
  if (!raw || raw.length < 32) {
    throw new Error(
      "MCP_JWT_SECRET is missing or too short (need >= 32 chars). " +
        "Set it: `vercel env add MCP_JWT_SECRET production` " +
        "(generate one with e.g. `openssl rand -base64 48`).",
    );
  }
  return new TextEncoder().encode(raw);
}

/**
 * TTLs.
 * - Auth code: 60 seconds. Single-use; short so leaked codes decay fast.
 * - Access token: 1 hour. Standard OAuth 2.1.
 * - Refresh token: 30 days. Long enough to be useful, short enough to bound
 *   damage if leaked. Rotated on every use.
 * - Client registration: 1 year. Client can re-register any time.
 */
export const ttl = {
  authCode: 60,
  accessToken: 60 * 60,
  refreshToken: 60 * 60 * 24 * 30,
  client: 60 * 60 * 24 * 365,
} as const;

/**
 * The single scope this server understands. Requesting anything else = error.
 */
export const scope = "mcp:read";

/**
 * OAuth endpoint paths on this server. Kept in one place so the metadata
 * documents and the handlers stay in sync.
 */
export const paths = {
  authorize: "/api/authorize",
  token: "/api/token",
  register: "/api/register",
  mcp: "/api/mcp",
  wellKnownProtectedResource: "/.well-known/oauth-protected-resource",
  wellKnownAuthorizationServer: "/.well-known/oauth-authorization-server",
} as const;

export function endpointUrl(path: string): string {
  return `${issuerUrl}${path}`;
}
