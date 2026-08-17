/**
 * End-to-end OAuth 2.1 flow smoke test — runs the handlers in-process against
 * Vercel-shaped mock req/res objects. Exercises the full path:
 *
 *   1. POST /register        → client_id
 *   2. GET  /authorize       → auth code (from redirect Location)
 *   3. POST /token           → access_token + refresh_token
 *   4. POST /mcp with token  → MCP response
 *   5. POST /mcp NO token    → 401 + WWW-Authenticate challenge
 *   6. POST /token refresh   → new access_token
 *
 * Run: `MCP_JWT_SECRET=$(openssl rand -base64 48) npm run eval:oauth`
 */

import { randomBytes, createHash } from "node:crypto";
import registerHandler from "../api/register.js";
import authorizeHandler from "../api/authorize.js";
import tokenHandler from "../api/token.js";
import mcpHandler from "../api/mcp.js";

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  headersSent: boolean;
};

function makeMockRes(): MockRes & {
  status(c: number): unknown;
  setHeader(k: string, v: string): unknown;
  getHeader(k: string): unknown;
  end(chunk?: unknown): unknown;
  write(chunk: unknown): boolean;
  json(o: unknown): unknown;
  redirect(code: number, url: string): unknown;
  hasHeader(k: string): boolean;
  removeHeader(k: string): void;
} {
  const chunks: Buffer[] = [];
  const state: MockRes = {
    statusCode: 200,
    headers: {},
    body: "",
    headersSent: false,
  };
  return {
    ...state,
    get statusCode() { return state.statusCode; },
    set statusCode(v) { state.statusCode = v; },
    get headers() { return state.headers; },
    get body() { return state.body; },
    get headersSent() { return state.headersSent; },
    status(c: number) { state.statusCode = c; return this; },
    setHeader(k: string, v: string) { state.headers[k.toLowerCase()] = v; return this; },
    getHeader(k: string) { return state.headers[k.toLowerCase()]; },
    hasHeader(k: string) { return k.toLowerCase() in state.headers; },
    removeHeader(k: string) { delete state.headers[k.toLowerCase()]; },
    json(o: unknown) {
      state.headers["content-type"] = "application/json";
      state.body = JSON.stringify(o);
      state.headersSent = true;
      return this;
    },
    write(chunk: unknown) {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
      chunks.push(buf);
      state.body = Buffer.concat(chunks).toString("utf8");
      return true;
    },
    end(chunk?: unknown) {
      if (chunk !== undefined) {
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
        chunks.push(buf);
        state.body = Buffer.concat(chunks).toString("utf8");
      }
      state.headersSent = true;
      return this;
    },
    redirect(code: number, url: string) {
      state.statusCode = code;
      state.headers["location"] = url;
      state.headersSent = true;
      return this;
    },
  };
}

function makeReq(opts: {
  method: string;
  url?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}): unknown {
  return {
    method: opts.method,
    url: opts.url ?? "/",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-forwarded-proto": "https",
      ...(opts.headers ?? {}),
    },
    query: opts.query ?? {},
    body: opts.body,
  };
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function invoke(
  handler: (req: unknown, res: unknown) => Promise<unknown> | unknown,
  req: unknown,
): Promise<ReturnType<typeof makeMockRes>> {
  const res = makeMockRes();
  await handler(req, res);
  return res;
}

async function main(): Promise<void> {
  const steps: Array<{ name: string; run: () => Promise<void> }> = [];
  let clientId = "";
  let authCode = "";
  let accessToken = "";
  let refreshToken = "";

  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  const redirectUri = "http://localhost:1234/callback";

  steps.push({
    name: "1. POST /register → client_id",
    run: async () => {
      const res = await invoke(
        registerHandler as (r: unknown, s: unknown) => unknown,
        makeReq({
          method: "POST",
          body: { client_name: "smoke test", redirect_uris: [redirectUri] },
        }),
      );
      assert(res.statusCode === 201, `expected 201, got ${res.statusCode}: ${res.body}`);
      const parsed = JSON.parse(res.body) as { client_id: string };
      clientId = parsed.client_id;
      assert(clientId.split(".").length === 3, "client_id should be a JWT (3 parts)");
    },
  });

  steps.push({
    name: "2. GET /authorize → redirect with code",
    run: async () => {
      const res = await invoke(
        authorizeHandler as (r: unknown, s: unknown) => unknown,
        makeReq({
          method: "GET",
          query: {
            response_type: "code",
            client_id: clientId,
            redirect_uri: redirectUri,
            state: "xyz",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            scope: "mcp:read",
          },
        }),
      );
      assert(res.statusCode === 302, `expected 302, got ${res.statusCode}: ${res.body}`);
      const loc = res.headers["location"];
      assert(loc, "no Location header on redirect");
      const url = new URL(loc);
      authCode = url.searchParams.get("code") ?? "";
      assert(authCode, "no code query param on redirect");
      assert(url.searchParams.get("state") === "xyz", "state was not preserved");
    },
  });

  steps.push({
    name: "3. POST /token → access_token + refresh_token",
    run: async () => {
      const res = await invoke(
        tokenHandler as (r: unknown, s: unknown) => unknown,
        makeReq({
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: {
            grant_type: "authorization_code",
            code: authCode,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
          },
        }),
      );
      assert(res.statusCode === 200, `expected 200, got ${res.statusCode}: ${res.body}`);
      const parsed = JSON.parse(res.body) as {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      };
      accessToken = parsed.access_token;
      refreshToken = parsed.refresh_token;
      assert(parsed.token_type === "Bearer", "token_type must be Bearer");
      assert(parsed.expires_in === 3600, `expires_in should be 3600, got ${parsed.expires_in}`);
    },
  });

  steps.push({
    name: "4. POST /mcp with Bearer → MCP initialize succeeds",
    run: async () => {
      const res = await invoke(
        mcpHandler as (r: unknown, s: unknown) => unknown,
        makeReq({
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          body: {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "smoke", version: "0" },
            },
          },
        }),
      );
      assert(res.statusCode === 200, `expected 200, got ${res.statusCode}: ${res.body}`);
      assert(res.body.includes("protocolVersion"), "missing protocolVersion in body");
      assert(res.body.includes("ask-me-mcp"), "missing serverInfo name in body");
    },
  });

  steps.push({
    name: "5. POST /mcp without token → 401 + WWW-Authenticate challenge",
    run: async () => {
      const res = await invoke(
        mcpHandler as (r: unknown, s: unknown) => unknown,
        makeReq({
          method: "POST",
          body: {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "no-auth", version: "0" },
            },
          },
        }),
      );
      assert(res.statusCode === 401, `expected 401, got ${res.statusCode}: ${res.body}`);
      const chal = res.headers["www-authenticate"];
      assert(chal, "missing WWW-Authenticate header");
      assert(chal.includes("Bearer"), "challenge must be Bearer");
      assert(chal.includes("resource_metadata="), "challenge must include resource_metadata");
    },
  });

  steps.push({
    name: "6. POST /token refresh_token → new access_token",
    run: async () => {
      const res = await invoke(
        tokenHandler as (r: unknown, s: unknown) => unknown,
        makeReq({
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId,
          },
        }),
      );
      assert(res.statusCode === 200, `expected 200, got ${res.statusCode}: ${res.body}`);
      const parsed = JSON.parse(res.body) as { access_token: string };
      assert(parsed.access_token, "no access_token in refresh response");
      assert(parsed.access_token !== accessToken, "refresh should rotate access_token");
    },
  });

  process.stdout.write("\nask-me-mcp OAuth flow test\n\n");
  let passed = 0;
  for (const s of steps) {
    try {
      await s.run();
      process.stdout.write(`  [PASS] ${s.name}\n`);
      passed++;
    } catch (err) {
      process.stdout.write(`  [FAIL] ${s.name}\n         ${(err as Error).message}\n`);
    }
  }
  process.stdout.write(`\n${passed}/${steps.length} passed.\n`);
  if (passed < steps.length) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`fatal: ${String(err)}\n`);
  process.exit(1);
});
