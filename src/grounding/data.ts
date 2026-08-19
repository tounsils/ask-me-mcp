/**
 * Grounding data — pre-extracted structured facts from the operator's public résumé,
 * PROJECTS-INDEX.md, and offer page. See src/grounding/index.ts for accessor helpers.
 *
 * Exported as a `.ts` module (not a JSON file) so bundlers like ncc (used by @vercel/node)
 * bundle it into the deployed serverless function reliably. JSON import attributes
 * (`import data from './data.json' with { type: 'json' }`) work at runtime in Node 20+
 * but are inconsistently supported by bundlers as of 2026.
 *
 * v0.2 will add a build step that regenerates this file from the source markdown.
 * For now: edit by hand and rebuild.
 */

const data = {
  "meta": {
    "operator": "Ilyes Tounsi",
    "extracted_from": [
      "tounsils.github.io/ResumeIlyes.pdf",
      "C:\\dev\\PROJECTS-INDEX.md",
      "C:\\dev\\P-BB-FractionalCTO\\offer-page.md"
    ],
    "extracted_at": "2026-08-15",
    "notes": "Pre-extracted structured grounding for v0. Later versions replace this with a build step that regenerates from the source markdown files."
  },
  "current_focus": {
    "allocation": [
      { "role": "Senior Software Engineer", "company": "NXT Robotics", "arrangement": "Fractional (~60%)", "since": "2025" },
      { "role": "VP of Engineering (Advisory)", "company": "AIMIA", "arrangement": "Part-time (~20%)", "since": "2025" },
      { "role": "Part-time engineering", "company": "Hydrostasis", "arrangement": "Part-time (~20%)", "since": "summer 2026" },
      { "role": "Founder & operator", "company": "digitalqrcard.com", "arrangement": "Solo founder", "since": "Dec 2024" }
    ],
    "active_vertical_wedge": {
      "product": "Digital QR Card — vertical undecided",
      "status": "The realtor wedge scoped 2026-08-14 was killed 2026-08-19 after the anchor pilot turned out to be neither a realtor nor a customer. Vertical positioning is being validated against actual organisation signups (rehab, trades, law all signed up week of 18-Aug) rather than a hypothesis.",
      "workspace": "P-DQC-Realtors (preserved with DEAD notice)"
    },
    "primary_headline": "20+ years shipping production systems; last 3 years layering AI/ML on top — LLM apps, RAG pipelines, MCP-based agent orchestration, voice, semantic search, human-in-the-loop workflows."
  },
  "engagements": [
    {
      "slug": "nxt-robotics",
      "company": "NXT Robotics",
      "role": "Senior Software Engineer (fractional, ~60%)",
      "since": "2025",
      "site": "https://www.nxtrobotics.com/",
      "product": "RobotogoAI — operator SaaS console + agent layer that turns raw device telemetry into ops decisions inside a Virtual Security Operations Center.",
      "customers_public": ["ACE / Snapdragon Stadium", "Petco Park", "Verdant", "ChargeHub", "Drone Informer", "Amazon parking pilot (300+ sites)"],
      "modules": ["dashboard-react-js (operator UI)", "dashboard-api (Laravel REST)", "dashboard-deploy (per-tenant IaC)", "nxt-cockpit(-api) (successor Executive Cockpit)", "nxt-brains (dual-audience knowledge repo)"],
      "recent_ships": ["Alerts UI end-to-end (severity taxonomy, deep-link)", "iOS video black-tile fix", "mobile swipeable camera carousel + battery graph", "BLE beacon CRUD", "battery-low threshold service", "Trello + Monday board integrations", "Cognito SRP auth migration"]
    },
    {
      "slug": "aimia",
      "company": "AIMIA",
      "role": "VP of Engineering (Advisory, part-time ~20%)",
      "since": "2025",
      "site": "https://aimia.me",
      "product": "AI-driven career + AI-literacy assessment platform.",
      "product_details_public": ["Conversational RIASEC / skills / values / personality / needs assessment", "48-question AI Proficiency Assessment across six domains", "Public shareable certificate at /verify/[certificateId]", "Multi-agent Gemini stack (6 specialists + supervisor)", "Gemini Live bidirectional voice + ElevenLabs fallback", "Multilingual (EN, zh-TW, zh-HK, ES)"],
      "institutional_partners": ["Irvine Valley College", "MIT", "Palomar College", "Mission Edge"],
      "confidential_note": "AIMIA has ongoing strategic work that will be disclosed by AIMIA leadership at their own pace. Not covered in public materials."
    },
    {
      "slug": "hydrostasis",
      "company": "Hydrostasis",
      "role": "Part-time engineering (~20%)",
      "since": "summer 2026",
      "product": "Internal admin portal on Retool with a scripted Test → Prod promotion pipeline (promote.js) that replaces Retool's default manual copy-paste with a diff-reviewable, reversible workflow.",
      "phase_status": "Phase 1 in production; phase 2 (webhook integrations) in flight."
    },
    {
      "slug": "digitalqrcard",
      "company": "Digital QR Card",
      "role": "Solo founder & operator",
      "since": "Dec 2024",
      "site": "https://www.digitalqrcard.com",
      "product": "B2C customizable QR-based digital business cards with built-in lead capture. Vertical positioning is currently undecided — being validated against real organisation-level demand signals (three organisation signups the week of 18-Aug from rehab, trades, and law sectors) rather than a pre-selected wedge."
    }
  ],
  "reusable_patterns": [
    { "name": "The MCP-Server Harness pattern", "source": "AIMIA (in production)", "summary": "Ship your product AS a remote MCP server in the AI-assistant connector directory rather than as its own web app. Six typed tools + coordinator + N elicitation + N supervisor agents + typed signal vector + versioned reasoning spec + rails + external grounding + evaluation corpus as certification gate. Model-agnostic per pairing. One MCP server, three storefronts.", "keywords": ["mcp", "harness", "agents", "typed-tools", "coordinator", "grounding", "certification-gate"] },
    { "name": "promote.js Test → Prod diff-review", "source": "Hydrostasis", "summary": "Scripted promotion of low-code app definitions (Retool, Bubble, Airtable, Salesforce metadata) from Test to Prod as a reviewable diff instead of manual copy-paste.", "keywords": ["retool", "low-code", "promotion", "diff", "deploy", "review"] },
    { "name": "nxt-brains dual-audience knowledge repo", "source": "NXT Robotics", "summary": "Docsify site + OKF v0.1 frontmatter + ADRs + CODEOWNERS. Single source of truth readable by both humans (via Docsify) and Claude Code (raw markdown). Feeds an AWS Bedrock KB.", "keywords": ["docsify", "knowledge-base", "adr", "claude-code", "team-knowledge", "bedrock-kb"] },
    { "name": "AIOS 5-layer architecture", "source": "Digital QR Card", "summary": "Context → Data → Intelligence → Automate → Build. Modular AI operating system wrapped around a business. Each layer independently valuable; layers not leaps.", "keywords": ["aios", "operator-trap", "automation", "solo-founder", "business-ops"] },
    { "name": "Plan-then-generate + adversarial verifier", "source": "P-seam", "summary": "Commit ground truth to a structured world model first; derive downstream artifacts from it; second AI reads artifacts back and flags contradictions against a versioned taxonomy. Kills LLM multi-doc drift.", "keywords": ["llm", "generation", "verifier", "drift", "structured-output"] },
    { "name": "Provenance receipt as a first-class product feature", "source": "P-seam", "summary": "Every generated artifact ships with a machine-readable receipt naming exact models used, taxonomy version, guardrails applied, and human sign-off status.", "keywords": ["provenance", "audit", "compliance", "governance", "ai-output"] },
    { "name": "Multi-agent supervisor stack", "source": "AIMIA", "summary": "N specialized domain agents + 1 supervisor synthesizer. Each specialist owns one dimension of the answer; supervisor composes.", "keywords": ["multi-agent", "supervisor", "specialists", "coordinator", "assessment"] },
    { "name": "AES-256-GCM Mongoose field encryption + HMAC blind-index lookup", "source": "AIMIA", "summary": "Application-layer encryption on Mongoose setters with HMAC-SHA256 blind-index columns so encrypted PII still dedupes and lookups still hit an index.", "keywords": ["encryption", "mongoose", "pii", "blind-index", "aes-256", "hmac"] },
    { "name": "Length-bias / anti-cheat LLM detector", "source": "AIMIA", "summary": "Retry generation when the LLM systematically writes longer correct answers than distractors — reveals answer-length leakage.", "keywords": ["anti-cheat", "llm", "evaluation", "length-bias", "assessment"] },
    { "name": "Live model discovery + smoke-test switcher (admin console)", "source": "AIMIA", "summary": "Admin panel enumerates available LLM models at runtime, runs a smoke prompt against each, and lets ops swap the default without a deploy.", "keywords": ["admin", "llm", "model-switch", "smoke-test", "ops"] },
    { "name": "Feature-flag matrix per tenant", "source": "NXT Robotics", "summary": "Project × feature matrix (AI Assist, alerts, battery, camera-streams, car-counting…) surfaced in the ops UI as toggles. Cheap tenant differentiation without branching code.", "keywords": ["feature-flags", "multi-tenant", "saas", "ops-ui"] },
    { "name": "⌘K categorized autocomplete + right-side drill-down Drawer", "source": "NXT Robotics (nxt-cockpit)", "summary": "Global command palette indexing every card + entity type, plus a persistent right-side drawer for entity detail without route change.", "keywords": ["command-palette", "drawer", "dashboard-ux"] },
    { "name": "Personal AIOS-lite", "source": "This operator's own portfolio", "summary": "Markdown operating layer (PROJECTS-INDEX + CONTRACTOR-INCOME + memory mirror) that keeps ~40 concurrent projects + income streams coherent across Claude Code sessions and human editing.", "keywords": ["portfolio", "solo-founder", "operations", "claude-code", "markdown"] }
  ],
  "availability": {
    "playbook_slots_open": 1,
    "playbook_slots_total": 1,
    "retainer_slots_open": 1,
    "retainer_slots_total": 2,
    "next_open_date": "2026-09-01",
    "notes_public": "1 active Playbook + 1 active Retainer, OR 2 Retainers, OR 2 back-to-back Playbooks. Never 2 concurrent Playbooks."
  },
  "offer": {
    "bundled": true,
    "products": [
      {
        "slug": "mcp-server-playbook",
        "name": "MCP-Server Product Playbook",
        "price_usd": 12000,
        "term": "6 weeks",
        "refund_clause": "50% refund if not shipped by end of week 6",
        "cap": "1 active engagement at a time",
        "summary": "Fixed-scope engagement that ships your product as a remote MCP server in Claude's connector directory, ChatGPT's Apps SDK, and via xAI's tool-calling API — one MCP server, three storefronts.",
        "deliverables": ["Typed tool contract (4–8 JSON-schema-strict MCP tools)", "Coordinator + N elicitation + N supervisor agent architecture", "Typed signal-extraction pipeline", "Versioned reasoning specification grounded in your domain", "Rails + confidence-per-answer discipline", "External grounding architecture (model never invents)", "Evaluation corpus + eval runner + per-model-pairing certification", "Remote MCP server deployment + connector-directory listing paperwork", "One passing eval on your production tool contract"]
      },
      {
        "slug": "fractional-cto-retainer",
        "name": "Fractional CTO Retainer",
        "price_usd_per_month": 3500,
        "term": "Month-to-month",
        "cap": "2 active retainer clients at a time; combined cap 1 Playbook + 1 Retainer, OR 2 Retainers, OR 2 back-to-back Playbooks",
        "summary": "Ongoing architecture-adult calls after the Playbook, or for founders who found me on the retainer track directly.",
        "deliverables": ["Weekly 60-minute strategy call", "Monthly written architecture memo (not a slide deck)", "Slack on-call for critical decisions", "Access to the reusable-patterns library", "First 90 days: yes/no verdict on current architecture, 12-month hiring roadmap, 3 vendor decisions"]
      },
      {
        "slug": "session-addon",
        "name": "Investor / all-hands session (add-on)",
        "price_usd_per_session": 500,
        "term": "Per session",
        "cap": "—"
      }
    ],
    "booking_channels": {
      "email": "tounsils@gmail.com",
      "linkedin": "https://linkedin.com/in/mohameditounsi",
      "github": "https://github.com/tounsils"
    },
    "location": "Carlsbad, CA · Remote-first · US and international clients"
  },
  "location": "Carlsbad, CA, USA",
  "contact": {
    "email": "tounsils@gmail.com",
    "phone": "+1 (760) 481-4120",
    "linkedin": "https://linkedin.com/in/mohameditounsi",
    "github": "https://github.com/tounsils",
    "site": "https://tounsils.github.io"
  }
};

export default data;
