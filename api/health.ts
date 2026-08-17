/**
 * Diagnostic endpoint. Returns 200 with a JSON summary of the runtime.
 * If this responds but /api/mcp doesn't, the failure is in the MCP-specific
 * imports (SDK deep paths, server module graph). If this ALSO fails, it's
 * a project-level setup issue (dependency resolution, function wrapper).
 *
 * Zero SDK imports — smallest possible surface area.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    ok: true,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    request: {
      method: req.method,
      url: req.url,
      hasBody: req.body !== undefined,
      bodyType: typeof req.body,
      contentType: req.headers["content-type"] ?? null,
      accept: req.headers["accept"] ?? null,
    },
    env: {
      VERCEL: process.env["VERCEL"] ?? null,
      VERCEL_ENV: process.env["VERCEL_ENV"] ?? null,
      VERCEL_REGION: process.env["VERCEL_REGION"] ?? null,
    },
    timestamp: new Date().toISOString(),
  });
}
