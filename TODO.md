# ask-me-mcp — todo

Seeded 2026-09-25 from `PROJECTS-INDEX.md` and `P-Cockpit-ilyes/INBOX.md`.

This is the public reference implementation of the MCP-Server Harness pattern
and the demoable case study behind the MCP-Server Playbook offer. Its job is to
be checkable by a stranger, which makes uptime the feature.

## Open

- [ ] **Keep it reachable.** It is cited from the public offer page as proof.
      A dead link here costs more than the server does, and nothing currently
      tells you if it stops responding.
- [ ] **Point it at `finance-mcp`.** The offer now has a second reference
      implementation in a regulated domain and this one does not mention it.

## Done

- [x] Listed in the official MCP Registry 2026-08-27 as
      `io.github.tounsils/ask-me-mcp`, status active, namespace authenticated via
      GitHub rather than payment. Remote-server listing, so no npm package needed.
- [x] OAuth 2.1 shipped 2026-08-19: anonymous Dynamic Client Registration, PKCE
      S256, self-signed JWTs, zero storage. RFC 9728, RFC 8414 and RFC 7591
      metadata complete. Verified live by curl rather than by assertion.
- [x] `docs/oauth-flow.md` written as the reference deliverable for Playbook
      engagements, including the upgrade path from anonymous DCR to real user
      identity.

## Standing rules, not tasks

- Grounded only in what is already public: the résumé, `PROJECTS-INDEX.md` and
  the offer page. No client detail, no counterparty names.
