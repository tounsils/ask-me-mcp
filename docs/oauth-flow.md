# OAuth 2.1 flow — ask-me-mcp

Reference implementation of MCP-spec-compliant OAuth for a public-data remote MCP server. Ships anonymous DCR + self-signed JWTs — zero storage, zero database, Vercel-serverless-friendly. Every part of the flow is a signed JWT verifiable in-process.

## Why anonymous grants

Different MCP servers gate on different things. Rough taxonomy:

| Server type | Auth gate | Example |
|---|---|---|
| **Public read-only** (this one) | None. Everyone gets the same answers. | ask-me-mcp — public résumé + patterns. |
| **Per-user private data** | User identity from an IdP. | A GitHub PR MCP that needs to know *which* user is asking. |
| **Enterprise / paid** | Per-tenant seat + billing. | A Notion / Linear connector. |

The MCP HTTP transport spec requires OAuth 2.1 regardless of what the server gates on. For public-read-only servers, we still need the OAuth *ceremony* (Claude's connector directory requires it), but we don't need to actually authenticate anyone. Anonymous DCR + auto-approved auth codes let us satisfy the spec with zero user friction.

Swapping this for real user identity later is a bounded, well-defined change — see [§ Swapping anonymous grants for upstream identity](#swapping-anonymous-grants-for-upstream-identity) at the bottom.

## The eight endpoints

All served by Vercel serverless functions in [`api/`](../api/):

| Endpoint | Path | Purpose |
|---|---|---|
| Protected Resource Metadata | `GET /.well-known/oauth-protected-resource` | RFC 9728. Tells clients where the auth server lives. |
| Authorization Server Metadata | `GET /.well-known/oauth-authorization-server` | RFC 8414. Declares supported flows + endpoints. |
| Dynamic Client Registration | `POST /api/register` | RFC 7591. Client posts metadata, gets back `client_id`. |
| Authorization | `GET /api/authorize` | Auto-approves; redirects with `code=`. |
| Token | `POST /api/token` | Exchanges auth code (or refresh token) for an access token. |
| MCP endpoint | `POST /api/mcp` | The actual product. Requires `Authorization: Bearer` — otherwise returns 401 + `WWW-Authenticate` challenge. |
| Diagnostic | `GET /api/health` | Unauthenticated. Runtime environment snapshot. |

Well-known paths reach their handlers via `rewrites` in [`vercel.json`](../vercel.json) — Vercel functions only live under `api/`, so `/.well-known/foo` → `/api/foo` at the routing layer.

## The full flow (client's perspective)

```
Client (Claude Desktop, Claude Code, ChatGPT App)
  │
  │  1. Discover
  ├──> GET /.well-known/oauth-protected-resource
  │     ↓
  │     { resource, authorization_servers: [<issuer>], scopes_supported: ["mcp:read"] }
  │
  ├──> GET /.well-known/oauth-authorization-server
  │     ↓
  │     { authorization_endpoint, token_endpoint, registration_endpoint,
  │       grant_types_supported: ["authorization_code", "refresh_token"],
  │       code_challenge_methods_supported: ["S256"], ... }
  │
  │  2. Register (anonymous — no auth on this endpoint)
  ├──> POST /api/register
  │     { "client_name": "Claude Desktop", "redirect_uris": ["..."] }
  │     ↓
  │     { "client_id": "<signed JWT>", "client_secret_expires_at": 0, ... }
  │
  │  3. Authorize (auto-approved, no consent screen)
  │     Generate code_verifier + code_challenge = base64url(SHA256(code_verifier))
  ├──> GET /api/authorize?response_type=code
  │                     &client_id=<id>&redirect_uri=<uri>&state=<xyz>
  │                     &code_challenge=<challenge>&code_challenge_method=S256
  │     ↓ 302 Location: <redirect_uri>?code=<auth_code>&state=<xyz>
  │
  │  4. Exchange code for tokens (with PKCE verifier)
  ├──> POST /api/token
  │     Content-Type: application/x-www-form-urlencoded
  │     grant_type=authorization_code&code=<code>&redirect_uri=<uri>
  │     &client_id=<id>&code_verifier=<verifier>
  │     ↓
  │     { "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 3600,
  │       "refresh_token": "<jwt>", "scope": "mcp:read" }
  │
  │  5. Call the actual MCP endpoint
  └──> POST /api/mcp
        Authorization: Bearer <access_token>
        { "jsonrpc": "2.0", "id": 1, "method": "tools/call", ... }
        ↓
        MCP response
```

## Everything is a JWT — the zero-storage trick

Instead of the usual Redis/Postgres approach for OAuth state, every artefact is a signed JWT with a purpose-specific `typ` claim. Verifying a token just means verifying its signature — no database lookup.

| Artefact | `typ` claim | Contents | TTL |
|---|---|---|---|
| `client_id` | `mcp+client` | Full RFC 7591 client metadata (redirect_uris, grant_types, etc.) | 1 year |
| `auth_code` | `mcp+auth_code` | `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method` | 60 seconds |
| `access_token` | `mcp+access_token` | `client_id`, `scope` | 1 hour |
| `refresh_token` | `mcp+refresh_token` | `client_id`, `scope` | 30 days |

Every JWT also has:
- `iss` (issuer) — the canonical URL of this server
- `iat` (issued at) — Unix timestamp
- `exp` (expiration) — Unix timestamp
- `jti` (JWT ID) — 16 random bytes, base64url — guarantees uniqueness across tokens issued in the same second

Verification enforces all four. See [`src/oauth/jwt.ts`](../src/oauth/jwt.ts).

**Signing secret:** HMAC-SHA256 with `MCP_JWT_SECRET` (Vercel env var). Rotating the secret invalidates every issued token — the nuclear revocation option.

## PKCE (RFC 7636 S256) is required

Public clients (no `client_secret`) always use PKCE. The auth code carries the `code_challenge` in its payload; the token endpoint checks that `base64url(SHA256(code_verifier))` equals the challenge. No PKCE = no tokens.

## What the 401 challenge looks like

Any request to `/api/mcp` without a valid Bearer token gets:

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="ask-me-mcp",
                  resource_metadata="https://.../.well-known/oauth-protected-resource",
                  error="invalid_token"
Content-Type: application/json

{
  "error": "invalid_token",
  "error_description": "Access token missing or invalid. Discover the OAuth flow at ...",
  "resource_metadata": "https://.../.well-known/oauth-protected-resource",
  "authorization_server": "https://..."
}
```

This is what makes the auto-discovery flow work — clients see the 401, parse the challenge, hit the metadata endpoint, and start the flow.

## Environment variables

Set in Vercel (Settings → Environment Variables → add for Production):

| Var | Required | Purpose |
|---|:---:|---|
| `MCP_JWT_SECRET` | ✅ | HMAC-SHA256 signing secret. **Minimum 32 characters.** Generate with `openssl rand -base64 48`. |
| `MCP_ISSUER_URL` | ❌ | Canonical URL of this server. Defaults to `https://ask-me-mcp-xi.vercel.app`. Set if you move to a custom domain. |

The server throws a clear error if `MCP_JWT_SECRET` is missing or too short — no silent fallback to a guessable default.

## Local development

```bash
export MCP_JWT_SECRET="$(openssl rand -base64 48)"
npm run build
npm run eval:oauth    # runs the 6-step OAuth flow test in-process
npm run dev           # starts the stdio MCP server (no auth needed for stdio)
```

## Swapping anonymous grants for upstream identity

To gate on a real user identity later (GitHub OAuth, Google, magic-link email, whatever), change *two* files:

1. **[`api/authorize.ts`](../api/authorize.ts)** — replace the auto-approve with a redirect to the upstream identity provider. When the upstream IdP redirects back, verify their token, extract a stable user ID, then issue the auth code JWT with the user ID in a `sub` claim.

2. **[`src/oauth/codeGrant.ts`](../src/oauth/codeGrant.ts)** — `issueAccessToken` / `issueRefreshToken` add the user ID as `sub`. Verifiers already validate `iss` and `exp` — nothing else to change.

Downstream: the MCP tool handlers receive the user ID and can gate per-user data on it. All other flow bits (DCR, token endpoint, PKCE, metadata) are identical.

**What that looks like in your Playbook engagement:**

The MCP-Server Playbook offers this OAuth pattern as-shipped. Upstream-identity work is a scoped v2 extension:
- Choose IdP (GitHub is easiest, ~1 day)
- Add a `users` store (Vercel KV or Postgres — first stateful component)
- Add consent screen (~half day of UI work)
- Wire user ID through the tool layer

Total upgrade time from the anonymous baseline: **~2–4 days**. That's a follow-on engagement, not scope-creep.

## What this pattern is not

- **Not enterprise-grade OAuth.** No revocation list, no admin console, no audit log, no rate limiting per client, no billing hooks. Everything above is deliberate for a public-data MCP server. Add each of them in a follow-on engagement if the target buyer needs them.
- **Not a general-purpose authorization server.** The `scope` is hard-coded to `mcp:read`, PKCE is mandatory, only `authorization_code` + `refresh_token` grant types are supported. Everything else is rejected by design.
- **Not battle-tested.** This ships as a reference implementation. Have someone review the OAuth code before deploying it in front of anything that matters.

## Related files

- [`src/oauth/config.ts`](../src/oauth/config.ts) — issuer, scopes, TTLs, endpoint paths.
- [`src/oauth/jwt.ts`](../src/oauth/jwt.ts) — HS256 sign/verify wrappers around `jose`.
- [`src/oauth/clientRegistry.ts`](../src/oauth/clientRegistry.ts) — anonymous DCR (client_id = signed JWT).
- [`src/oauth/codeGrant.ts`](../src/oauth/codeGrant.ts) — auth code / access token / refresh token issue + verify; PKCE S256.
- [`api/register.ts`](../api/register.ts), [`api/authorize.ts`](../api/authorize.ts), [`api/token.ts`](../api/token.ts) — the three transactional endpoints.
- [`api/oauth-protected-resource.ts`](../api/oauth-protected-resource.ts), [`api/oauth-authorization-server.ts`](../api/oauth-authorization-server.ts) — metadata.
- [`api/mcp.ts`](../api/mcp.ts) — Bearer verification + 401 challenge.
- [`eval/oauth-flow.ts`](../eval/oauth-flow.ts) — the 6-step end-to-end test.
