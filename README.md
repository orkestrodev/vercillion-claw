---
title: Claw Assistant
emoji: 🦾
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Claw — Autonomous Personal Assistant

An autonomous assistant that operates a computer to finish multi-step tasks — read/write files, run shell commands in a sandboxed workspace, browse the web with Playwright (`@mastra/agent-browser`), search the web through Mastra's Gateway, and follow reusable skills checked into `workspace/skills/`.

Claw has resource-scoped observational memory, so it remembers your preferences and context across threads.

## Deployment on Hugging Face Spaces

This repository is pre-configured for deployment on **Hugging Face Spaces** using the **Docker SDK**.

### Configuration
- **SDK**: Docker
- **Exposed Port**: 7860 (`app_port: 7860`)
- **User Permissions**: Runs as non-root UID 1000 with read/write access to the application and `workspace/` directories.
- **Browser Automation**: Includes Playwright with Chromium and requisite Linux libraries pre-installed.

### Environment Secrets on Hugging Face Spaces
Configure the following in your Space's **Settings > Variables and secrets**:

| Secret / Variable | Required | Description |
| ----------------- | :------: | ----------- |
| `MASTRA_GATEWAY_API_KEY` | **Yes** | API key from [gateway.mastra.ai](https://gateway.mastra.ai) to route chat models and web search. |
| `TURSO_DATABASE_URL` | No | libSQL/Turso URL. Defaults to local SQLite `file:/home/user/app/mastra.db`. |
| `TURSO_AUTH_TOKEN` | No | Turso auth token (omit for local file DB). |
| `PORT` | No | Server port. Defaults to `7860` on Hugging Face Spaces. |
| `MASTRA_HOST` | No | Server bind address. Defaults to `0.0.0.0`. |
| `CLAW_WORKSPACE_DIR` | No | Agent workspace directory. Defaults to `./workspace`. |
| `BROWSER_HEADLESS` | No | Set to `false` to run browser headfully (defaults to headless). |
| `BROWSER_CDP_URL` | No | Optional hosted browser CDP URL (e.g. Browserbase) for external browser execution. |

---

## Local Development

### Prerequisites

- Node.js `>= 22.13.0`
- A Gateway API key — get one at [gateway.mastra.ai](https://gateway.mastra.ai)
- (Optional) A Turso database; for local dev, the default `file:./mastra.db` works.
- Playwright's Chromium browser for local runs, or `BROWSER_CDP_URL` for a hosted Chrome/Browserbase/Browserless instance in server deployments.

### Setup

```bash
npm install
cp .env.example .env
# fill in MASTRA_GATEWAY_API_KEY (TURSO_DATABASE_URL defaults to file:./mastra.db)
npm run dev
```

Then open Mastra Studio (URL printed by `npm run dev`) and chat with the `claw` agent.

### Docker Build & Run Locally

```bash
docker build -t claw-assistant .
docker run -p 7860:7860 -e MASTRA_GATEWAY_API_KEY=your_key claw-assistant
```

Access the agent API and UI at `http://localhost:7860`.

---

## Workspace Layout

```text
workspace/
├── personas/
│   ├── elon-musk/
│   └── persona-workflow.md
├── skills/
│   ├── general-tasks/SKILL.md
│   └── research-tasks/SKILL.md
├── artifacts/
└── … your files end up here
```

The agent can only read/write inside `workspace/` (or whatever `CLAW_WORKSPACE_DIR` points at). The sandboxed shell runs with that directory as its CWD.

## Adding Skills

Create a new folder under `workspace/skills/<skill-name>/` with a `SKILL.md`:

```markdown
---
name: my-skill
description: Short summary the agent uses to decide when to apply this skill.
version: 1
metadata:
  tags: [optional, tags]
---

# Process

1. Step one.
2. Step two.
```

The agent will pick up new skills on the next request.

## Agent Editor

This template enables the code-backed Agent Editor with `new MastraEditor({ source: 'code', codePath: 'mastra/editor' })`. Edits made in Studio are written as deterministic JSON overrides under `mastra/editor/agents/`, so Mastra Platform can open GitHub pull requests for agent changes instead of only saving them to the database.
