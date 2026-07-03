# Project Governance

## Owner

This project is owned by **Rico Majesty Daniel Mitra** ([@RicoMitra](https://github.com/RicoMitra)).

## Purpose

SkillOps OS is a local-first governance dashboard for `SKILL.md` workflows used with Codex and AI coding sessions. It helps users import local skill files, understand what each skill does, sequence skills by project phase, detect conflicts, and export governance context for Codex and Obsidian.

The product is not an AI chat app, LLM wrapper, skill marketplace, team collaboration tool, cloud sync product, or remote skill-sharing service.

## Strict Non-Goals

- No AI chat
- No LLM calls
- No accounts
- No cloud sync
- No cloud database
- No team workspace
- No marketplace
- No remote skill sharing
- No automatic modification of `SKILL.md` files
- No backend scanning or server-side skill parsing

## Core Capabilities

- Import local `SKILL.md` files through Directory Picker.
- Offer upload fallback for current-session `SKILL.md` reading.
- Parse metadata, descriptions, trigger rules, phase hints, tool requirements, and risk signals in the browser.
- Mark uncertain extraction as `Needs review`.
- Recommend phase-aware skill sequences.
- Show low-noise warnings with exact detected triggers and recommended actions.
- Summarize governance coverage across planning, build, UI polish, QA, and documentation phases.
- Export a Codex prompt and Obsidian Markdown note client-side.

## Required Technology Stack

- Next.js with TypeScript
- Tailwind CSS
- shadcn/ui-compatible primitives
- Recharts
- pnpm
- Vitest and Testing Library
- Vercel for portfolio/demo deployment only

## Data and Privacy Rules

The browser is the source of truth. All parsing, classification, sequencing, warning generation, and export generation must run client-side.

Directory handles are optional browser permissions and must be re-requested if access is lost. Uploaded files are session-only. Store local app state and parsed summaries only; do not persist uploaded raw skill contents unless the owner explicitly approves a future decision.

## Product and Design Direction

The interface should feel like an original local-first governance console: calm, premium, operational, dense but readable, and GitHub-portfolio ready. Use a high-contrast editorial-tech command-center direction with dark focal surfaces, near-white supporting space, cool gray panels, deep charcoal text, subtle slate borders, one restrained mature accent, Geist, and Geist Mono.

Do not use warm ivory, beige, amber-gold, brownish gold, yellow primary accents, neon color, or washed-out low-contrast sections.

Avoid generic admin-template composition. Preserve a memorable first-screen command surface, layered modules, and strong hierarchy.

Do not clone provided reference images. They are moodboard-level inspiration for tone, density, and information hierarchy only.

## Engineering Rules

- Keep domain parsing and governance logic in framework-independent TypeScript functions.
- Avoid `any`.
- Prefer deterministic rules over hidden heuristics.
- Do not guess aggressively when metadata is weak.
- Keep warnings explainable, specific, and low-noise.
- Do not add backend routes for skill scanning.
- Do not add authentication, databases, external APIs, or LLM dependencies.
- Keep UI accessible with semantic HTML, labels, visible focus states, and responsive layouts.
- Use pnpm consistently.

## Decision-Making Policy

Agents may make small reversible implementation choices that follow this document and existing project patterns.

Ask the owner before changing product scope, data handling, storage semantics, external integrations, core architecture, visual direction, or anything that weakens the strict non-goals.

## Required Knowledge Sources

Read these before product or architecture changes:

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `DECISIONS.md`
4. `DESIGN.md` before UI work

Keep these documents synchronized when approved changes affect scope, architecture, data handling, governance semantics, or user experience.
