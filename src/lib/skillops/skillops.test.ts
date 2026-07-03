import { describe, expect, it } from "vitest";
import {
  analyzeSkills,
  applyClassificationOverrides,
  buildObsidianNote,
  buildPromptExport,
  parseSkillDocument,
  recommendSequence,
  summarizeCoverage,
  type ProjectBrief,
} from "./skillops";

const frontendSkill = `---
name: frontend-god-mode
description: Use this skill whenever the user asks to build, create, design, redesign, polish, audit, animate, improve, fix, or make prettier ANY frontend interface.
---

# Frontend God Mode

Use for building React dashboards with Tailwind, accessibility, layout, components, and production UI flows.
`;

const emilSkill = `---
name: emil-design-eng
description: This skill encodes Emil Kowalski's philosophy on UI polish, component design, animation decisions, and invisible details.
---

# Design Engineering

Use after the functional UI exists. Polish spacing, typography, animation, transitions, hierarchy, and interaction details.
`;

const browserSkill = `---
name: browser
description: Control the in-app Browser. Use to open, navigate, inspect, test, click, type, screenshot, or verify local targets.
---

# Browser

Use after build passes to inspect localhost, console errors, screenshots, responsive layout, and keyboard flows.
`;

const vagueSkill = `# Untitled

This file has notes but no clear metadata or trigger rules.
`;

const cavemanSkill = `---
name: caveman
description: Token-saving terse mode. Use to simplify responses, preserve context, avoid filler, and keep decisions small.
---

# Caveman Mode

## Purpose
Keep communication short and context-saving. This can mention UI work or build tasks, but the skill is about simplification and constraints.
`;

const brainstormingSkill = `---
name: brainstorming
description: Use before creative work to clarify assumptions, research options, define constraints, and plan the smallest useful scope.
---

# Brainstorming

## When to use
Use during planning to explore strategy, decide scope, and clarify requirements before implementation.
`;

const docsSkill = `---
name: github-doc-export
description: Create README, markdown, changelog, deployment notes, Obsidian notes, and commit summaries.
---

# Documentation Export

## Expected output
Markdown docs, GitHub case study, and deployment notes.
`;

const workflowSkill = `---
name: agent-orchestrator
description: Route agents, sequence workflow steps, delegate tasks, coordinate tool use, and hand off work.
---

# Agent Workflow

## Purpose
Govern automation and orchestration across multiple agents.
`;

const ambiguousSkill = `---
name: mixed-signal-helper
description: Plan implementation and verify documentation with equal emphasis.
---

# Mixed Signal Helper

## Purpose
Plan scope, implement code, verify tests, and export docs.
`;

const brief: ProjectBrief = {
  projectType: "Local-first developer tool",
  goal: "Govern local SKILL.md usage for Codex workflows",
  timeline: "MVP in two weeks",
  focus: "Planning, build, UI polish, QA, documentation exports",
  riskTolerance: "low",
};

describe("parseSkillDocument", () => {
  it("extracts frontmatter, description, phase, risk, tools, and confidence", () => {
    const parsed = parseSkillDocument({
      path: "frontend-god-mode/SKILL.md",
      source: "codex",
      content: frontendSkill,
    });

    expect(parsed.name).toBe("frontend-god-mode");
    expect(parsed.phase).toBe("Build");
    expect(parsed.category).toBe("Frontend Engineering");
    expect(parsed.riskLevel).toBe("Medium");
    expect(parsed.confidence).toBe("High");
    expect(parsed.needsReview).toBe(false);
    expect(parsed.topScoringPhases[0]?.phase).toBe("Build");
    expect(parsed.extractedEvidence.length).toBeGreaterThan(0);
    expect(parsed.decisionReason).toContain("Build");
  });

  it("marks weak metadata as Needs review instead of guessing aggressively", () => {
    const parsed = parseSkillDocument({
      path: "unknown/SKILL.md",
      source: "upload",
      content: vagueSkill,
    });

    expect(parsed.name).toBe("unknown");
    expect(parsed.phase).toBe("Needs review");
    expect(parsed.category).toBe("Needs review");
    expect(parsed.confidence).toBe("Low");
    expect(parsed.needsReview).toBe(true);
    expect(parsed.needsReviewReason).toContain("No strong deterministic phase signal");
  });

  it("uses weighted phase scoring so body keywords do not override name and purpose", () => {
    const parsed = parseSkillDocument({
      path: "skills/caveman/SKILL.md",
      source: "codex",
      content: cavemanSkill,
    });

    expect(parsed.phase).toBe("Planning");
    expect(parsed.category).toBe("Simplification / Context-saving");
    expect(parsed.phase).not.toBe("Build");
    expect(parsed.category).not.toBe("UI/UX");
    expect(parsed.topScoringPhases[0]?.phase).toBe("Planning");
  });

  it("classifies brainstorming-like skills as Planning and Ideation", () => {
    const parsed = parseSkillDocument({ path: "brainstorming/SKILL.md", source: "codex", content: brainstormingSkill });

    expect(parsed.phase).toBe("Planning");
    expect(parsed.category).toBe("Ideation / Research");
  });

  it("classifies design polish skills as UI polish and Visual Design", () => {
    const parsed = parseSkillDocument({ path: "emil-design-eng/SKILL.md", source: "codex", content: emilSkill });

    expect(parsed.phase).toBe("UI polish");
    expect(parsed.category).toBe("Visual Design / UX Polish");
  });

  it("classifies browser verification skills as QA / Review", () => {
    const parsed = parseSkillDocument({ path: "browser/SKILL.md", source: "codex", content: browserSkill });

    expect(parsed.phase).toBe("QA / Review");
    expect(parsed.category).toBe("Verification");
  });

  it("classifies documentation/export skills as Documentation", () => {
    const parsed = parseSkillDocument({ path: "docs/SKILL.md", source: "codex", content: docsSkill });

    expect(parsed.phase).toBe("Documentation");
    expect(parsed.category).toBe("Documentation / GitHub");
  });

  it("classifies agent workflow skills as Workflow / Orchestration", () => {
    const parsed = parseSkillDocument({ path: "agent-orchestrator/SKILL.md", source: "codex", content: workflowSkill });

    expect(parsed.phase).toBe("Workflow / Orchestration");
    expect(parsed.category).toBe("Agent Workflow");
  });

  it("marks close mixed signals as Needs review instead of guessing", () => {
    const parsed = parseSkillDocument({ path: "mixed/SKILL.md", source: "codex", content: ambiguousSkill });

    expect(parsed.phase).toBe("Needs review");
    expect(parsed.needsReview).toBe(true);
    expect(parsed.needsReviewReason).toContain("Top phase scores are too close");
  });

  it("applies local user classification overrides before sequencing", () => {
    const skill = parseSkillDocument({ path: "mixed/SKILL.md", source: "codex", content: ambiguousSkill });
    const [overridden] = applyClassificationOverrides([skill], {
      "codex:mixed/SKILL.md:mixed-signal-helper": {
        phase: "Documentation",
        category: "Documentation / GitHub",
      },
    });

    expect(overridden.phase).toBe("Documentation");
    expect(overridden.category).toBe("Documentation / GitHub");
    expect(overridden.confidence).toBe("High");
    expect(overridden.needsReview).toBe(false);
    expect(overridden.decisionReason).toContain("Local override");
  });
});

describe("recommendSequence", () => {
  it("places build before Emil polish and browser QA after build", () => {
    const skills = [
      parseSkillDocument({ path: "emil/SKILL.md", source: "codex", content: emilSkill }),
      parseSkillDocument({ path: "browser/SKILL.md", source: "codex", content: browserSkill }),
      parseSkillDocument({ path: "frontend/SKILL.md", source: "codex", content: frontendSkill }),
    ];

    const sequence = recommendSequence(skills, brief);

    expect(sequence.map((item) => item.name)).toEqual([
      "frontend-god-mode",
      "emil-design-eng",
      "browser",
    ]);
    expect(sequence[1].reason).toContain("final polish");
    expect(sequence[2].phase).toBe("QA / Review");
  });

  it("orders workflow, planning, build, polish, QA, and documentation phases", () => {
    const skills = [
      parseSkillDocument({ path: "docs/SKILL.md", source: "codex", content: docsSkill }),
      parseSkillDocument({ path: "browser/SKILL.md", source: "codex", content: browserSkill }),
      parseSkillDocument({ path: "frontend/SKILL.md", source: "codex", content: frontendSkill }),
      parseSkillDocument({ path: "brainstorming/SKILL.md", source: "codex", content: brainstormingSkill }),
      parseSkillDocument({ path: "workflow/SKILL.md", source: "codex", content: workflowSkill }),
      parseSkillDocument({ path: "emil/SKILL.md", source: "codex", content: emilSkill }),
    ];

    expect(recommendSequence(skills, brief).map((item) => item.phase)).toEqual([
      "Workflow / Orchestration",
      "Planning",
      "Build",
      "UI polish",
      "QA / Review",
      "Documentation",
    ]);
  });
});

describe("analyzeSkills", () => {
  it("emits low-noise warnings with exact triggers and recommended actions", () => {
    const skills = [
      parseSkillDocument({ path: "frontend/SKILL.md", source: "codex", content: frontendSkill }),
      parseSkillDocument({ path: "frontend-copy/SKILL.md", source: "agents", content: frontendSkill }),
      parseSkillDocument({ path: "emil/SKILL.md", source: "codex", content: emilSkill }),
      parseSkillDocument({ path: "vague/SKILL.md", source: "upload", content: vagueSkill }),
    ];

    const report = analyzeSkills(skills, brief);

    expect(report.warnings.length).toBeGreaterThanOrEqual(2);
    expect(report.warnings.every((warning) => warning.trigger.length > 0)).toBe(true);
    expect(report.warnings.every((warning) => warning.recommendedAction.length > 0)).toBe(true);
    expect(report.warnings.some((warning) => warning.title === "Duplicate skill purpose")).toBe(true);
    expect(report.warnings.some((warning) => warning.title === "Metadata needs review")).toBe(true);
  });
});

describe("summarizeCoverage and exports", () => {
  it("summarizes phase coverage and builds local export artifacts", () => {
    const skills = [
      parseSkillDocument({ path: "frontend/SKILL.md", source: "codex", content: frontendSkill }),
      parseSkillDocument({ path: "emil/SKILL.md", source: "codex", content: emilSkill }),
      parseSkillDocument({ path: "browser/SKILL.md", source: "codex", content: browserSkill }),
    ];
    const sequence = recommendSequence(skills, brief);
    const report = analyzeSkills(skills, brief);
    const coverage = summarizeCoverage(sequence);

    expect(coverage.find((item) => item.phase === "Build")?.status).toBe("Covered");
    expect(coverage.find((item) => item.phase === "QA / Review")?.count).toBe(1);

    const prompt = buildPromptExport({ brief, sequence, warnings: report.warnings, coverage });
    const note = buildObsidianNote({ brief, sequence, warnings: report.warnings, coverage });

    expect(prompt).toContain("No AI chat, no LLM calls");
    expect(prompt).toContain("Frontend God Mode");
    expect(note).toContain("# SkillOps Governance Note");
    expect(note).toContain("Local-first developer tool");
  });
});
