import { describe, expect, it } from "vitest";
import {
  analyzeSkills,
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
    expect(parsed.category).toBe("UI/UX");
    expect(parsed.riskLevel).toBe("Medium");
    expect(parsed.confidence).toBe("High");
    expect(parsed.needsReview).toBe(false);
    expect(parsed.detectedTriggers).toContain("description: build/create/design frontend interface");
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
    expect(sequence[2].phase).toBe("QA");
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
    expect(coverage.find((item) => item.phase === "QA")?.count).toBe(1);

    const prompt = buildPromptExport({ brief, sequence, warnings: report.warnings, coverage });
    const note = buildObsidianNote({ brief, sequence, warnings: report.warnings, coverage });

    expect(prompt).toContain("No AI chat, no LLM calls");
    expect(prompt).toContain("Frontend God Mode");
    expect(note).toContain("# SkillOps Governance Note");
    expect(note).toContain("Local-first developer tool");
  });
});
