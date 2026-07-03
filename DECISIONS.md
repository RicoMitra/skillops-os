# Decision Log

## D-001: Local-First Governance Dashboard

- **Status:** Accepted
- **Decision:** Build SkillOps OS as a local-first dashboard for governing `SKILL.md` workflows.
- **Rationale:** Skill selection needs structure without adding cloud or AI dependency.
- **Consequence:** All core analysis runs in the browser.

## D-002: Strict No-AI and No-Cloud V1

- **Status:** Accepted
- **Decision:** V1 has no AI chat, LLM calls, accounts, cloud sync, team workspace, marketplace, remote skill sharing, automatic `SKILL.md` modification, or backend scanning.
- **Rationale:** The project is governance tooling, not another AI platform.
- **Consequence:** No external API, auth, database, or server parsing code belongs in V1.

## D-003: Directory Picker Default

- **Status:** Accepted
- **Decision:** Use Directory Picker as the default local skill access method.
- **Rationale:** It preserves local-first behavior while respecting browser sandbox permissions.
- **Consequence:** Directory permission may be lost and must be re-requested.

## D-004: Upload Fallback Is Session-Only

- **Status:** Accepted
- **Decision:** Upload fallback reads `SKILL.md` files only for the current session.
- **Rationale:** This avoids persisting raw uploaded skill contents.
- **Consequence:** Parsed summaries may be stored locally, but raw uploaded content is not.

## D-005: Deterministic Needs Review Fallback

- **Status:** Accepted
- **Decision:** Low-confidence metadata extraction is marked `Needs review`.
- **Rationale:** Guessing aggressively would undermine governance quality.
- **Consequence:** Sequencing excludes low-confidence skills until reviewed.

## D-006: Original UI, Reference as Moodboard Only

- **Status:** Accepted
- **Decision:** The provided reference image guides tone and density only.
- **Rationale:** The final interface must be original and portfolio-ready.
- **Consequence:** Do not clone the reference layout or visual details.

## D-007: Cool Neutral Governance Console Visual Direction

- **Status:** Accepted
- **Decision:** Use a sharper cool-neutral governance-console palette with deep charcoal text, cool gray panels, slate borders, and one restrained slate-blue accent.
- **Rationale:** The previous beige/gold direction felt too private-banking and not technical enough for SkillOps governance.
- **Consequence:** Avoid beige, warm ivory, amber-gold, brownish gold, yellow accents, neon styling, and washed-out low-contrast sections.
