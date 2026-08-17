# ask-me-mcp

A persona MCP server. Ask Claude / ChatGPT / Grok about the operator's work, patterns, availability, and offer — grounded in their public résumé, projects index, and offer page.

> **Reference implementation of the MCP-Server Harness pattern.** This repo is a working example of the same architecture the operator sells as a productized 6-week engagement. If you like the shape, that's the sales pitch — see [The pattern](#the-pattern-the-mcp-server-harness) at the bottom.

## What it does

Six typed tools any AI-assistant user can call:

| Tool | What it returns |
|---|---|
| `get_current_focus` | Current allocation, active engagements, and the primary vertical wedge in progress. |
| `get_engagement_summary` | A specific engagement (NXT Robotics, AIMIA, Hydrostasis, Digital QR Card) described at a public-safe level. |
| `search_reusable_patterns` | Keyword search over the operator's 12+ reusable engineering-patterns catalog. |
| `check_availability` | How many Playbook / Retainer slots are open + earliest next-open date. |
| `get_offer_details` | Current bundled offer: MCP-Server Playbook + Fractional CTO Retainer. |
| `book_discovery_call` | Instructions + prep guidance for booking a discovery call. **Does not auto-schedule. Explicitly refuses to negotiate price.** |

Every response ships with a confidence label and a source citation. The server never invents; if the grounding data doesn't say it, the server doesn't say it.

## Install (as a user)

The remote endpoint speaks MCP Streamable HTTP + OAuth 2.1. Three ways to connect:

### 1. Claude Desktop — connector directory ("Connect" button)

Add via the Claude Desktop UI: **Settings → Connectors → Add custom connector → URL: `https://ask-me-mcp-xi.vercel.app/api/mcp`**. Click **Connect**. The desktop client discovers OAuth metadata, registers as a client, exchanges tokens, and mounts the tools. No manual config.

### 2. Claude Desktop / Claude Code — config file (skip OAuth)

Add to `claude_desktop_config.json` — location varies by OS; see [Claude Desktop config docs](https://modelcontextprotocol.io/quickstart/user):

```jsonc
{
  "mcpServers": {
    "ask-me": {
      "url": "https://ask-me-mcp-xi.vercel.app/api/mcp"
    }
  }
}
```

### 3. Claude Code CLI

```bash
claude mcp add --scope user ask-me https://ask-me-mcp-xi.vercel.app/api/mcp
```

### Local stdio (development)

For local stdio dev (no HTTP, no OAuth — auth doesn't apply to stdio):

```jsonc
{
  "mcpServers": {
    "ask-me": {
      "command": "node",
      "args": ["/absolute/path/to/ask-me-mcp/dist/src/server.js"]
    }
  }
}
```

Then in any Claude Code session:

> what's Ilyes's current focus?
> what patterns has he shipped for LLM evaluation?
> is he available for a Playbook engagement in October?

## Develop (as a maintainer)

### Requirements

- Node.js 20+
- npm (or pnpm / yarn — package.json is npm-first)

### Setup

```bash
git clone https://github.com/tounsils/ask-me-mcp.git
cd ask-me-mcp
npm install
```

### Run locally as a stdio server

```bash
npm run dev
```

Point Claude Code or the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) at the resulting process.

### Build for production

```bash
npm run build
```

Outputs to `dist/`.

### Deploy to Vercel

```bash
# Set the JWT signing secret (one-time; required for OAuth).
vercel env add MCP_JWT_SECRET production
# Paste a long random string. Generate one: `openssl rand -base64 48`.

vercel deploy --prod
```

The `api/mcp.ts` handler serves the [Streamable HTTP transport](https://modelcontextprotocol.io/docs/concepts/transports) with OAuth 2.1 protection — the format Claude's connector directory and ChatGPT's Apps SDK both use. See [`docs/oauth-flow.md`](docs/oauth-flow.md) for the full architecture.

### Run the eval corpus

```bash
npm run eval           # 15 tool cases against handlers directly (no HTTP)
npm run eval:oauth     # 6-step end-to-end OAuth flow (needs MCP_JWT_SECRET)
```

The tool corpus fails the build if fewer than a threshold percentage of expected answers match. **Pass or nothing ships.**

The OAuth flow test exercises register → authorize → token → protected /api/mcp → 401 challenge → refresh — all in-process against Vercel-shaped mock req/res objects.

## Repository layout

```
ask-me-mcp/
├── src/
│   ├── server.ts               # shared MCP server (used by both stdio + HTTP)
│   ├── tools/                  # six typed tool implementations
│   │   ├── getCurrentFocus.ts
│   │   ├── getEngagementSummary.ts
│   │   ├── searchReusablePatterns.ts
│   │   ├── checkAvailability.ts
│   │   ├── getOfferDetails.ts
│   │   └── bookDiscoveryCall.ts
│   ├── grounding/
│   │   ├── data.json           # pre-extracted structured facts (v0)
│   │   └── index.ts            # loaders + search helpers
│   └── rails/
│       └── confidence.ts       # confidence + source-citation wrapper; refusal helper
│   └── oauth/                  # OAuth 2.1 + PKCE + anonymous DCR
│       ├── config.ts           # issuer, scopes, TTLs, endpoint paths
│       ├── jwt.ts              # HS256 sign/verify (via `jose`)
│       ├── clientRegistry.ts   # client_id = signed JWT (no DB)
│       └── codeGrant.ts        # auth code + access/refresh token + PKCE S256
├── api/
│   ├── mcp.ts                          # Vercel serverless entry (Streamable HTTP + Bearer auth)
│   ├── health.ts                       # diagnostic (unauthenticated)
│   ├── register.ts                     # RFC 7591 DCR
│   ├── authorize.ts                    # authorization endpoint (auto-approves)
│   ├── token.ts                        # token exchange with PKCE
│   ├── oauth-protected-resource.ts     # RFC 9728 metadata
│   └── oauth-authorization-server.ts   # RFC 8414 metadata
├── eval/
│   ├── corpus.json             # 15 tool cases + expected answers
│   ├── runner.ts               # replays tool corpus, threshold-gated
│   └── oauth-flow.ts           # 6-step OAuth end-to-end test
├── docs/
│   └── oauth-flow.md           # OAuth architecture + how to swap for real user identity
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## The pattern: the MCP-Server Harness

This project is a reference implementation of a pattern the operator ships to clients as a productized 6-week engagement — the **MCP-Server Product Playbook**.

The shape:

1. **Typed tool contract.** Six JSON-schema-strict tools. Nothing free-form. The model can only invoke these, only with these arguments.
2. **Coordinator + specialists (extensible).** v0 has one coordinator (the MCP server routing tool calls). v1 will add elicitation + supervisor agents inside more complex tools.
3. **Typed signal vector.** Structured facts extracted from the grounding data. Not free-text.
4. **Versioned reasoning specification.** The tool implementations ARE the reasoning spec — versioned in the code, not in a prompt.
5. **Rails + confidence.** Every response carries `confidence` + `sources` + optional `disclaimers`. The model can display them.
6. **External grounding.** The server queries `src/grounding/data.json`; the model never invents.
7. **Evaluation corpus + eval runner + certification.** `eval/corpus.json` has expected answers; `npm run eval` replays them. Ships or doesn't.

If you're building a product that fits this shape (career guidance, medical triage, legal intake, financial planning, coaching, expert-system anything), the operator sells a 6-week fixed-scope engagement to ship it. See [`get_offer_details`](src/tools/getOfferDetails.ts) or email `tounsils@gmail.com`.

## License

MIT. See [LICENSE](LICENSE).

## Attribution

Built by [Ilyes Tounsi](https://linkedin.com/in/mohameditounsi) · Carlsbad, CA · [tounsils.github.io](https://tounsils.github.io).
