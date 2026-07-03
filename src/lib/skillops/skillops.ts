export type GovernancePhase = "Planning" | "Build" | "UI polish" | "QA" | "Documentation" | "Needs review";
export type SkillCategory = "General" | "UI/UX" | "QA" | "Documentation" | "Governance" | "Needs review";
export type RiskLevel = "Low" | "Medium" | "High" | "Needs review";
export type Confidence = "High" | "Medium" | "Low";
export type SkillSource = "codex" | "agents" | "upload" | "directory";

export type SkillFileInput = {
  path: string;
  source: SkillSource;
  content: string;
};

export type ParsedSkill = {
  id: string;
  path: string;
  source: SkillSource;
  name: string;
  displayName: string;
  description: string;
  phase: GovernancePhase;
  category: SkillCategory;
  riskLevel: RiskLevel;
  confidence: Confidence;
  needsReview: boolean;
  detectedTriggers: string[];
  requiredTools: string[];
};

export type ProjectBrief = {
  projectType: string;
  goal: string;
  timeline: string;
  focus: string;
  riskTolerance: "low" | "medium" | "high";
};

export type SequenceItem = ParsedSkill & {
  order: number;
  reason: string;
};

export type GovernanceWarning = {
  id: string;
  severity: "Info" | "Attention" | "High";
  title: string;
  trigger: string;
  recommendedAction: string;
};

export type CoverageItem = {
  phase: Exclude<GovernancePhase, "Needs review">;
  count: number;
  status: "Covered" | "Missing";
};

export type GovernanceReport = {
  sequence: SequenceItem[];
  warnings: GovernanceWarning[];
  coverage: CoverageItem[];
};

export type ExportPayload = {
  brief: ProjectBrief;
  sequence: SequenceItem[];
  warnings: GovernanceWarning[];
  coverage: CoverageItem[];
};

const PHASE_ORDER: Record<Exclude<GovernancePhase, "Needs review">, number> = {
  Planning: 10,
  Build: 20,
  "UI polish": 30,
  QA: 40,
  Documentation: 50,
};

const PHASES: Array<Exclude<GovernancePhase, "Needs review">> = ["Planning", "Build", "UI polish", "QA", "Documentation"];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
}

function fallbackName(path: string) {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  const parent = parts.at(-2);
  const file = parts.at(-1)?.replace(/\.md$/i, "");
  return slugify(parent && parent.toLowerCase() !== "skills" ? parent : file ?? "skill");
}

function titleCase(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bUi\b/g, "UI")
    .replace(/\bUx\b/g, "UX")
    .replace(/\bQa\b/g, "QA");
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const metadata: Record<string, string> = {};
  if (!match) return { metadata, body: content };

  for (const line of match[1].split(/\r?\n/)) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    metadata[rawKey.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
  }

  return { metadata, body: content.slice(match[0].length).trim() };
}

function detectPhase(text: string): { phase: GovernancePhase; trigger: string | null } {
  const lower = text.toLowerCase();
  const checks: Array<[Exclude<GovernancePhase, "Needs review">, string[], string]> = [
    ["Planning", ["planning", "brainstorm", "scope", "constraints", "spec", "requirements"], "planning/scope/spec keywords"],
    ["Build", ["build", "create", "frontend", "react", "next.js", "tailwind", "component", "dashboard"], "build/create/frontend keywords"],
    ["UI polish", ["polish", "emil", "typography", "spacing", "animation", "transition", "visual refinement"], "polish/typography/animation keywords"],
    ["QA", ["browser", "screenshot", "inspect", "verify", "test", "console errors", "localhost"], "browser/verify/test keywords"],
    ["Documentation", ["readme", "github", "obsidian", "markdown", "documentation", "docs"], "documentation/export keywords"],
  ];

  const matches = checks
    .map(([phase, keywords, trigger]) => ({ phase, trigger, score: keywords.filter((keyword) => lower.includes(keyword)).length }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);

  if (matches.length === 0) return { phase: "Needs review", trigger: null };
  return { phase: matches[0].phase, trigger: matches[0].trigger };
}

function detectCategory(name: string, text: string, phase: GovernancePhase): SkillCategory {
  const lower = `${name} ${text}`.toLowerCase();
  if (phase === "Needs review") return "Needs review";
  if (lower.includes("frontend") || lower.includes("ui") || lower.includes("ux") || lower.includes("design")) return "UI/UX";
  if (phase === "QA") return "QA";
  if (phase === "Documentation") return "Documentation";
  if (lower.includes("governance") || lower.includes("superpower") || lower.includes("ponytail") || lower.includes("caveman")) return "Governance";
  return "General";
}

function detectRisk(text: string, phase: GovernancePhase, confidence: Confidence): RiskLevel {
  if (confidence === "Low") return "Needs review";
  const lower = text.toLowerCase();
  if (lower.includes("must") || lower.includes("always") || lower.includes("mandatory") || lower.includes("do not")) return "High";
  if (phase === "Build" || phase === "UI polish" || lower.includes("animation") || lower.includes("modify")) return "Medium";
  return "Low";
}

function detectTools(text: string) {
  const lower = text.toLowerCase();
  const tools = [
    ["browser", "Browser"],
    ["computer use", "Computer Use"],
    ["github", "GitHub"],
    ["google drive", "Google Drive"],
    ["node_repl", "Node REPL"],
    ["playwright", "Playwright"],
  ];
  return tools.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
}

function confidenceFrom(metadata: Record<string, string>, phase: GovernancePhase, description: string): Confidence {
  let score = 0;
  if (metadata.name) score += 2;
  if (description.length > 30) score += 2;
  if (phase !== "Needs review") score += 2;
  if (/use (this )?skill|trigger|when/i.test(description)) score += 1;
  if (!metadata.name && !metadata.description && phase === "Needs review") return "Low";
  if (score >= 5) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

export function parseSkillDocument(input: SkillFileInput): ParsedSkill {
  const { metadata, body } = parseFrontmatter(input.content);
  const name = slugify(metadata.name || fallbackName(input.path));
  const description = metadata.description || body.split(/\r?\n/).find((line) => line.trim().length > 20)?.trim() || "";
  const analysisText = `${name}\n${description}\n${body}`;
  const phaseHit = detectPhase(analysisText);
  const confidence = confidenceFrom(metadata, phaseHit.phase, description);
  const phase = confidence === "Low" ? "Needs review" : phaseHit.phase;
  const category = detectCategory(name, analysisText, phase);
  const triggers = [
    metadata.description && description.toLowerCase().includes("frontend")
      ? "description: build/create/design frontend interface"
      : null,
    phaseHit.trigger ? `body: ${phaseHit.trigger}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    id: `${input.source}:${input.path}:${name}`,
    path: input.path,
    source: input.source,
    name,
    displayName: titleCase(name),
    description,
    phase,
    category,
    riskLevel: detectRisk(analysisText, phase, confidence),
    confidence,
    needsReview: confidence === "Low",
    detectedTriggers: triggers,
    requiredTools: detectTools(analysisText),
  };
}

function sequenceReason(skill: ParsedSkill, brief: ProjectBrief) {
  if (skill.phase === "UI polish") return "Use after core features exist for final polish and premium interaction details.";
  if (skill.phase === "QA") return "Run after build checks pass to verify localhost, console, responsive layout, and exports.";
  if (skill.phase === "Build") return `Build the core dashboard for ${brief.projectType}.`;
  if (skill.phase === "Documentation") return "Capture the final workflow into GitHub and Obsidian-ready documentation.";
  if (skill.phase === "Planning") return "Define scope, constraints, and the smallest safe workflow before implementation.";
  return "Review metadata before assigning this skill to a workflow.";
}

export function recommendSequence(skills: ParsedSkill[], brief: ProjectBrief): SequenceItem[] {
  return skills
    .filter((skill) => !skill.needsReview)
    .sort((a, b) => {
      const aPhase = a.phase === "Needs review" ? 999 : PHASE_ORDER[a.phase];
      const bPhase = b.phase === "Needs review" ? 999 : PHASE_ORDER[b.phase];
      return aPhase - bPhase || a.name.localeCompare(b.name);
    })
    .map((skill, index) => ({
      ...skill,
      order: index + 1,
      reason: sequenceReason(skill, brief),
    }));
}

export function summarizeCoverage(sequence: SequenceItem[]): CoverageItem[] {
  return PHASES.map((phase) => {
    const count = sequence.filter((item) => item.phase === phase).length;
    return { phase, count, status: count > 0 ? "Covered" : "Missing" };
  });
}

export function analyzeSkills(skills: ParsedSkill[], brief: ProjectBrief): GovernanceReport {
  const warnings: GovernanceWarning[] = [];
  const sequence = recommendSequence(skills, brief);

  const purposeMap = new Map<string, ParsedSkill[]>();
  for (const skill of skills) {
    if (skill.needsReview) continue;
    const key = `${skill.phase}:${skill.category}:${skill.name.replace(/-copy$/, "")}`;
    purposeMap.set(key, [...(purposeMap.get(key) ?? []), skill]);
  }

  for (const group of purposeMap.values()) {
    if (group.length > 1) {
      warnings.push({
        id: `duplicate-${group[0].name}`,
        severity: "Attention",
        title: "Duplicate skill purpose",
        trigger: `${group.length} skills share phase/category/name pattern: ${group.map((skill) => skill.path).join(", ")}`,
        recommendedAction: "Keep one primary skill for this phase and mark the rest as optional.",
      });
    }
  }

  const phaseCounts = new Map<GovernancePhase, number>();
  for (const skill of skills) phaseCounts.set(skill.phase, (phaseCounts.get(skill.phase) ?? 0) + 1);
  for (const [phase, count] of phaseCounts) {
    if (phase !== "Needs review" && count > 3) {
      warnings.push({
        id: `too-many-${phase}`,
        severity: "Attention",
        title: "Too many skills in one phase",
        trigger: `${count} skills classified as ${phase}.`,
        recommendedAction: "Reduce this phase to the smallest set that covers the workflow.",
      });
    }
  }

  for (const skill of skills.filter((item) => item.needsReview)) {
    warnings.push({
      id: `review-${skill.id}`,
      severity: "Info",
      title: "Metadata needs review",
      trigger: `${skill.path} has low confidence metadata extraction.`,
      recommendedAction: "Review the skill manually before including it in an execution prompt.",
    });
  }

  const polishBeforeBuild =
    sequence.find((item) => item.phase === "UI polish") &&
    !sequence.find((item) => item.phase === "Build");
  if (polishBeforeBuild) {
    warnings.push({
      id: "polish-without-build",
      severity: "Attention",
      title: "Polish without build phase",
      trigger: "A UI polish skill is present but no build-phase skill was confidently detected.",
      recommendedAction: "Add or confirm a build-phase skill before final polish.",
    });
  }

  return {
    sequence,
    warnings,
    coverage: summarizeCoverage(sequence),
  };
}

function linesForWarnings(warnings: GovernanceWarning[]) {
  if (warnings.length === 0) return "- No warnings detected from current deterministic rules.";
  return warnings.map((warning) => `- ${warning.title}: ${warning.trigger} Action: ${warning.recommendedAction}`).join("\n");
}

export function buildPromptExport(payload: ExportPayload) {
  const sequence = payload.sequence.map((item) => `${item.order}. ${item.displayName} [${item.phase}] - ${item.reason}`).join("\n");
  const coverage = payload.coverage.map((item) => `- ${item.phase}: ${item.status} (${item.count})`).join("\n");
  return `# Codex Skill Governance Prompt

Project type: ${payload.brief.projectType}
Goal: ${payload.brief.goal}
Timeline: ${payload.brief.timeline}
Focus: ${payload.brief.focus}
Risk tolerance: ${payload.brief.riskTolerance}

Hard boundaries:
- No AI chat, no LLM calls
- No accounts, cloud sync, team workspace, marketplace, or remote skill sharing
- No automatic modification of SKILL.md files
- No backend scanning or server-side skill parsing
- Keep all parsing, classification, sequencing, warnings, and exports in the browser

Recommended skill sequence:
${sequence || "- No sequence generated. Review imported skills first."}

Coverage:
${coverage}

Warnings:
${linesForWarnings(payload.warnings)}

Execution rule:
Use the sequence above as governance context. If a warning applies, follow the recommended action before implementation.`;
}

export function buildObsidianNote(payload: ExportPayload) {
  const sequence = payload.sequence.map((item) => `- ${item.order}. [[${item.displayName}]] - ${item.phase} - ${item.reason}`).join("\n");
  const coverage = payload.coverage.map((item) => `- ${item.phase}: ${item.status} (${item.count})`).join("\n");
  return `# SkillOps Governance Note

## Project Brief

- Project type: ${payload.brief.projectType}
- Goal: ${payload.brief.goal}
- Timeline: ${payload.brief.timeline}
- Focus: ${payload.brief.focus}
- Risk tolerance: ${payload.brief.riskTolerance}

## Recommended Sequence

${sequence || "- No sequence generated. Review imported skills first."}

## Coverage

${coverage}

## Warnings

${linesForWarnings(payload.warnings)}

## Local-First Boundary

This note was generated from local browser analysis. No AI chat, LLM call, login, cloud database, cloud sync, remote sharing, backend scanning, or SKILL.md modification is part of this workflow.`;
}
