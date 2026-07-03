# Design

> Source of truth for SkillOps OS typography, color, motion, layout, and component rules.
> Read this before touching the UI in later sessions.

## Aesthetic Direction

Original local-first governance console: premium, operational, calm, sharper than a generic admin dashboard, with a clean technical feel.

## Dials

- DESIGN_VARIANCE: 6 / 10
- MOTION_INTENSITY: 3 / 10
- VISUAL_DENSITY: 6 / 10

## Type Stack

- Display: Geist
- Body: Geist
- Mono: Geist Mono
- Loaded via: `next/font/google`
- Use mono for counts and numeric summaries.

Banned: Inter, Roboto, Arial, system-ui as primary UI fonts, serif dashboard typography.

## Color Tokens

Core colors use OKLCH cool neutrals:

- Background: near-white/light stone
- Surface: crisp near-white
- Panel: cool gray
- Foreground: charcoal
- Accent: restrained slate-blue
- Success: muted emerald
- Warning: controlled orange
- Danger: muted rose

Banned: pure black, pure white, beige/ivory private-banking palettes, amber/gold accents, brownish neutrals, yellow primary actions, purple-blue gradients, neon accents, untinted shadows.

## Layout

- Shell: sidebar on desktop, top-stacked on mobile.
- Container: full dashboard surface with responsive padding.
- Cards: single-level only; no cards inside cards.
- Data tables: horizontal overflow allowed only inside table container.
- Touch targets: 44px minimum.

## Motion

- Buttons use subtle active scale.
- Transitions only on color, border, shadow, transform.
- No bounce or elastic motion.
- Respect `prefers-reduced-motion`.

## Component Inventory

- Custom shadcn-compatible `Button`
- Custom shadcn-compatible `Input`
- Custom shadcn-compatible `Card`
- `SkillOpsDashboard`
- Recharts coverage chart

## Copy Rules

- Direct, operational, no hype.
- Avoid filler words: elevate, unleash, seamless, next-gen, revolutionary.
- Explicitly state local-first and no-AI boundaries.

## Last Updated

2026-07-03 by initial SkillOps OS implementation.
2026-07-03 by cool-neutral governance-console redesign.
