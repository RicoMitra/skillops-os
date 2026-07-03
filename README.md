# SkillOps OS

Local-first governance dashboard for Codex `SKILL.md` workflows.

SkillOps OS imports local skill files, classifies them with deterministic browser-side rules, recommends a phase-aware workflow, flags low-noise governance warnings, and exports Codex prompts plus Obsidian Markdown notes.

## Features

- Recursive Directory Picker import for local skill folders
- Upload fallback for multiple current-session `SKILL.md` files
- Browser-only weighted parsing and classification
- Phase-aware skill sequencing
- Low-noise conflict and risk warnings
- Governance coverage summary
- Local classification overrides without modifying source `SKILL.md`
- Codex prompt export
- Obsidian Markdown export
- Local reset action

## Strict Non-Goals

- No AI chat
- No LLM calls
- No accounts
- No cloud sync
- No team workspace
- No marketplace
- No remote skill sharing
- No automatic modification of `SKILL.md` files
- No backend scanning

## Privacy Model

All parsing, classification, sequencing, warning generation, and exports run in the browser. Directory access requires explicit browser permission. Uploaded files are read for the current session. Parsed summaries and project brief may be stored locally; raw uploaded skill contents are not intentionally persisted.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Recharts
- Vitest
- Testing Library
- pnpm
- Vercel for portfolio/demo deployment

## Local Setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deployment

This app should be deployed as its own Vercel project connected to its own GitHub repository. Do not attach it to another project repository or Vercel app.

GitHub URL: https://github.com/RicoMitra/skillops-os

Vercel URL: https://skillops-os.vercel.app
