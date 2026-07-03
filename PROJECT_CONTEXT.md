# Project Context

## Product Summary

SkillOps OS is a local-first governance dashboard for Codex and AI coding skill workflows. It imports local `SKILL.md` files, extracts deterministic metadata, classifies skills by phase and risk, recommends a practical sequence, identifies low-noise warnings, and exports Codex and Obsidian artifacts.

## Primary User

The primary user is an individual developer or AI coding operator who uses many local skills and wants a disciplined workflow from planning through build, UI polish, QA, and documentation.

## V1 Scope

- Local `SKILL.md` import
- Deterministic governance analysis
- Phase-aware sequencing
- Low-noise warnings
- Codex prompt export
- Obsidian Markdown export

## Strict Non-Goals

No AI chat, LLM calls, accounts, cloud sync, team workspace, marketplace, remote skill sharing, automatic `SKILL.md` modification, or backend scanning.

## Data Flow

1. User selects a local skill folder with Directory Picker or uploads one or more `SKILL.md` files for the session.
2. Browser reads file content with explicit user permission.
3. Parser extracts frontmatter and body signals.
4. Weighted deterministic classifier assigns phase, category, risk, confidence, top scoring phases, evidence, decision reason, and review state.
5. Governance engine recommends sequence and warnings.
6. UI presents library, source path, evidence, sequence, coverage, warnings, and exports.
7. Browser downloads Codex prompt or Obsidian note.

Raw uploaded skill content is not persisted. Parsed summaries and project brief may be saved locally.

## Architecture

- Next.js App Router renders a client dashboard.
- Domain logic lives in pure TypeScript under `src/lib/skillops`.
- UI state and browser file access live in the client component.
- No API routes are required for V1.
- Recharts visualizes coverage only; textual values remain visible.

## Definition of Done

The MVP is complete when a user can import local `SKILL.md` files, see deterministic classifications, review uncertain skills, generate a recommended sequence, understand any warnings, export both artifacts, reset local state, and use the app on desktop and mobile. Linting, type checking, tests, production build, and browser QA must pass.
