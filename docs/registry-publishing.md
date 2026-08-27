# Publishing to the official MCP Registry

`server.json` in the repo root is written, schema-validated, and ready. This is what to run.

**Cost: free.** There is no fee anywhere in the registry. Abuse is prevented by namespace authentication rather than payment: you prove you own `io.github.tounsils` through GitHub, and only you can publish under it.

## Do this first, or do not publish at all

**The deployed server is behind the repo.** `npx vercel --prod` has not run since the 2026-08-27 fix, so the live endpoint still returns the full rate card and `C:\dev\...` filesystem paths as its sources. Publishing to a registry aimed at MCP developers advertises whatever is live at the time.

```
cd C:\dev\P-ask-me-mcp
npx vercel login
npx vercel --prod
```

Then confirm the fix is actually live before going further:

```
curl -s https://ask-me-mcp-xi.vercel.app/api/mcp -o /dev/null -w "%{http_code}\n"
```

A `401` is correct: it is the OAuth challenge. Then call `get_offer_details` from a Claude session and check that no figure and no `C:\` path comes back.

## Why no npm publish is needed

The quickstart assumes a packaged server distributed through npm. This one is **remote**: a hosted endpoint at `https://ask-me-mcp-xi.vercel.app/api/mcp`. Remote servers are declared with a `remotes` array and need no package, no `mcpName` field in `package.json`, and no npm account.

The eligibility rule is that the server must be publicly reachable and not restricted to a private network. This one qualifies on both counts, and it is also a public MIT repo, so it clears the bar twice over.

## Steps

**1. Install the publisher CLI** (Windows PowerShell):

```
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") { "arm64" } else { "amd64" }
Invoke-WebRequest -Uri "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_windows_$arch.tar.gz" -OutFile "mcp-publisher.tar.gz"
tar xf mcp-publisher.tar.gz mcp-publisher.exe
rm mcp-publisher.tar.gz
```

Move `mcp-publisher.exe` somewhere on `PATH`, then check it: `mcp-publisher --help`

**2. Authenticate with GitHub.** This is a device-code flow, so it needs a browser and cannot be scripted:

```
mcp-publisher login github
```

It prints a code, you enter it at `https://github.com/login/device`. The GitHub account must be `tounsils`, because the server name is `io.github.tounsils/ask-me-mcp` and the namespace has to match the authenticated account.

**3. Publish** from the repo root, where `server.json` sits:

```
mcp-publisher publish
```

**4. Verify it landed:**

```
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.tounsils/ask-me-mcp"
```

## What is in server.json, and why

| Field | Value | Reason |
|---|---|---|
| `name` | `io.github.tounsils/ask-me-mcp` | Reverse-DNS namespace tied to the GitHub account. Must match the account used at login. |
| `title` | Ask Me | Display name in aggregators. |
| `description` | 97 characters | **Hard cap is 100.** The first draft was 283 and the schema validator rejected it. |
| `version` | 0.1.0 | Matches `package.json`. Bump both together on republish. |
| `remotes[0].type` | `streamable-http` | SSE is deprecated; only add an `sse` entry to support older clients. |
| `remotes[0].url` | the Vercel endpoint | Must be publicly reachable. |
| `websiteUrl` | the offer page | The one field that sends a reader somewhere commercial. |

**OAuth needs no declaration.** The `headers` property exists for static API keys. This server does OAuth discovery properly: an unauthenticated request returns `401` with a `WWW-Authenticate` challenge and clients take it from there. That is what the 19-Aug OAuth work bought.

## Two things to be realistic about

**The registry is in preview.** Its own docs warn of breaking changes and data resets before general availability. A listing may need redoing.

**It is not a traffic event.** The registry explicitly says it is *"not intended to be directly consumed by host applications"*. It is upstream metadata that downstream marketplaces and aggregators pull, typically hourly. Distribution arrives indirectly and slowly. It is worth doing because it is permanent, aimed exactly at MCP developers, and costs one submission with no ongoing effort. It is not worth doing if the expectation is visitors this week.

## Republishing

Bump `version` in both `package.json` and `server.json`, redeploy, then `mcp-publisher publish` again. Registry versioning is documented at `modelcontextprotocol.io/registry/versioning`.
