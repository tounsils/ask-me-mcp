# ask-me-mcp

TypeScript MCP server, compiled with `tsc`. OAuth 2.1 (anonymous DCR, PKCE
S256, self-signed JWTs per RFC 9728 / 8414 / 7591). Deployed on Vercel. npm,
`package-lock.json`. No CI workflows.

## Commands

| Purpose | Command |
|---|---|
| Build | `npm run build` |
| Tests | `npm test` |
| Eval corpus | `npm run eval` |
| OAuth flow eval | `npm run eval:oauth` |
| Dev | `npm run dev` |

## Definition of done

- `npm run build` exits 0 — holds today
- `npm test` **runs something**. Today it is `vitest run` against a repo with
  **zero `*.test.ts` files**, so it prints "No test files found" and exits 1.
  Either wire `eval/runner.ts` and `eval/oauth-flow.ts` into vitest, or change
  the `test` script to invoke them
- `npm run eval` and `npm run eval:oauth` pass, with the case count and skip
  count stated
- Never commit to `main`

**Why this matters more here than elsewhere:** this repo is the public proof
artifact for MCP work. A `test` script that finds nothing and a suite that is
green are indistinguishable from outside the repo, and the README claims a
15-case corpus plus a 6-case OAuth flow test that `npm test` does not run.

**Known gap:** no CI. Add a workflow running build and test on push.
