# Design

> Source of truth for SkillOps OS typography, color, motion, layout, and component rules.
> Read this before touching the UI in later sessions.

## Aesthetic Direction

Original dark editorial-tech governance console: premium, operational, high-contrast, composed, layered, and visibly product-designed rather than admin-template. The premium language must apply to the entire app, not just the first screen.

## Dials

- DESIGN_VARIANCE: 7 / 10
- MOTION_INTENSITY: 3 / 10
- VISUAL_DENSITY: 7 / 10

## Type Stack

- Display: Geist
- Body: Geist
- Mono: Geist Mono
- Loaded via: `next/font/google`
- Use mono for counts and numeric summaries.

Banned: Inter, Roboto, Arial, system-ui as primary UI fonts, serif dashboard typography.

## Color Tokens

Core colors use OKLCH cool neutrals:

- Background: deep cool charcoal with subtle technical grid and radial depth
- Surface: dark glass/elevated panels with precise white alpha borders
- Panel: dark command surfaces used consistently across modules
- Foreground: cool near-white
- Accent: restrained slate-blue used only for primary actions and active states
- Success: muted emerald
- Warning: controlled orange
- Danger: muted rose

Banned: pure black, pure white, beige/ivory private-banking palettes, amber/gold accents, brownish neutrals, yellow primary actions, purple-blue gradients, neon accents, untinted shadows.

## Layout

- Shell: compact dark command rail with icon navigation.
- First screen: dark command-center identity surface with logo, concise definition, local-first trust message, import actions, and key metrics.
- Workflow modules: skill library, sequence, warnings, coverage, and exports below the first screen.
- Project brief: compact workflow profile only; never a dominant hero-side form.
- Container: max-width operational canvas with responsive padding.
- Cards: layered elevated panels, single nesting level only.
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
- Dark command rail
- Command-center hero panel
- Compact workflow profile panel
- Recharts coverage chart

## Copy Rules

- Direct, operational, no hype.
- Avoid filler words: elevate, unleash, seamless, next-gen, revolutionary.
- Explicitly state local-first and no-AI boundaries.

## Last Updated

2026-07-03 by initial SkillOps OS implementation.
2026-07-03 by cool-neutral governance-console redesign.
2026-07-03 by editorial-tech command-center redesign.
2026-07-03 by full-product dark governance-console redesign and multi-file import revision.
