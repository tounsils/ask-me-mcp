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

### In Claude Desktop

Add to `claude_desktop_config.json` — location varies by OS; see [Claude Desktop config docs](https://modelcontextprotocol.io/quickstart/user). For the remote (Vercel-hosted) endpoint:

```jsonc
{
  "mcpServers": {
    "ask-me": {
      "url": "https://ask-me-mcp-xi.vercel.app/api/mcp"
    }
  }
}
```

For local stdio dev:

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

### In Claude Code

```bash
claude mcp add --scope user ask-me https://ask-me-mcp-xi.vercel.app/api/mcp
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
vercel deploy
```

The `api/mcp.ts` handler serves the [Streamable HTTP transport](https://modelcontextprotocol.io/docs/concepts/transports) — the format Anthropic's connector directory and ChatGPT's Apps SDK both use.

### Run the eval corpus

```bash
npm run eval
```

Replays the eval corpus at `eval/corpus.json` against the deployed (or local) MCP server. Fails the build if fewer than a threshold percentage of expected answers match. **Pass or nothing ships.**

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
├── api/
│   └── mcp.ts                  # Vercel serverless entry (Streamable HTTP)
├── eval/
│   ├── corpus.json             # ~30 questions + expected answers
│   └── runner.ts               # replays corpus, prints pass/fail (coming soon)
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
