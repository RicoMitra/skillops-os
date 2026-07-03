export type GovernancePhase =
  | "Workflow / Orchestration"
  | "Planning"
  | "Build"
  | "UI polish"
  | "QA / Review"
  | "Documentation"
  | "Needs review";
export type SkillCategory =
  | "General"
  | "Simplification / Context-saving"
  | "Ideation / Research"
  | "Frontend Engineering"
  | "Engineering"
  | "Visual Design / UX Polish"
  | "Verification"
  | "Documentation / GitHub"
  | "Agent Workflow"
  | "Governance"
  | "Needs review";
export type RiskLevel = "Low" | "Medium" | "High" | "Needs review";
export type Confidence = "High" | "Medium" | "Low";
export type SkillSource = "codex" | "agents" | "upload" | "directory";

export type SkillFileInput = {
  path: string;
  source: SkillSource;
  content: string;
};

export type PhaseScore = {
  phase: Exclude<GovernancePhase, "Needs review">;
  score: number;
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
  topScoringPhases: PhaseScore[];
  extractedEvidence: string[];
  decisionReason: string;
  needsReviewReason?: string;
  overrideApplied?: boolean;
};

export type ClassificationOverride = {
  phase: Exclude<GovernancePhase, "Needs review">;
  category: Exclude<SkillCategory, "Needs review">;
};

export type ClassificationOverrides = Record<string, ClassificationOverride>;

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
  "Workflow / Orchestration": 5,
  Planning: 10,
  Build: 20,
  "UI polish": 30,
  "QA / Review": 40,
  Documentation: 50,
};

const PHASES: Array<Exclude<GovernancePhase, "Needs review">> = [
  "Workflow / Orchestration",
  "Planning",
  "Build",
  "UI polish",
  "QA / Review",
  "Documentation",
];

const KEYWORDS: Record<Exclude<GovernancePhase, "Needs review">, string[]> = {
  Planning: [
    "brainstorm",
    "plan",
    "planning",
    "scope",
    "simplify",
    "constraint",
    "constraints",
    "strategy",
    "decide",
    "decision",
    "research",
    "clarify",
    "assumption",
    "requirement",
    "requirements",
    "roadmap",
    "mvp",
    "caveman",
    "context-saving",
    "context saving",
    "token-saving",
    "token saving",
    "terse",
  ],
  Build: [
    "implement",
    "implementation",
    "code",
    "scaffold",
    "component",
    "api",
    "backend",
    "frontend",
    "state",
    "architecture",
    "feature",
    "logic",
    "database",
    "integration",
    "react",
    "next.js",
    "tailwind",
  ],
  "UI polish": [
    "polish",
    "visual",
    "layout",
    "spacing",
    "typography",
    "hierarchy",
    "ux",
    "interaction",
    "microinteraction",
    "micro-interaction",
    "design system",
    "cards",
    "responsive polish",
    "refinement",
    "animation",
    "transition",
  ],
  "QA / Review": [
    "test",
    "tests",
    "verify",
    "verification",
    "browser",
    "inspect",
    "screenshot",
    "accessibility",
    "console error",
    "console errors",
    "responsive qa",
    "validation",
    "audit",
    "check",
    "localhost",
  ],
  Documentation: [
    "readme",
    "changelog",
    "docs",
    "documentation",
    "export",
    "markdown",
    "obsidian",
    "case study",
    "commit summary",
    "deployment notes",
    "github",
  ],
  "Workflow / Orchestration": [
    "agent",
    "agents",
    "workflow",
    "sequence",
    "orchestrate",
    "orchestration",
    "route",
    "delegate",
    "tool use",
    "handoff",
    "automation",
    "governance",
    "dispatch",
  ],
};

const SOURCE_WEIGHTS = {
  namePath: 8,
  frontmatter: 8,
  structured: 5,
  toolsOutput: 3,
  body: 1,
};

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

function normalize(value: string) {
  return value.toLowerCase().replace(/[._-]+/g, " ");
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const metadata: Record<string, string> = {};
  if (!match) return { metadata, body: content };

  for (const line of match[1].split(/\r?\n/)) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    metadata[rawKey.trim().toLowerCase()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
  }

  return { metadata, body: content.slice(match[0].length).trim() };
}

function extractStructuredSections(body: string) {
  const lines = body.split(/\r?\n/);
  const wanted = /^(#{1,4}\s*)?(purpose|description|when to use|triggers?|tools?|expected output|rules?)\b/i;
  const chunks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!wanted.test(lines[index].replace(/^#+\s*/, "").trim())) continue;
    chunks.push(lines.slice(index, index + 8).join("\n"));
  }

  return chunks.join("\n");
}

function explicitPhase(value: string): Exclude<GovernancePhase, "Needs review"> | null {
  const lower = normalize(value);
  if (lower.includes("workflow") || lower.includes("orchestration")) return "Workflow / Orchestration";
  if (lower.includes("planning") || lower.includes("plan")) return "Planning";
  if (lower.includes("build") || lower.includes("implementation")) return "Build";
  if (lower.includes("polish") || lower.includes("visual") || lower.includes("design")) return "UI polish";
  if (lower.includes("qa") || lower.includes("review") || lower.includes("verification")) return "QA / Review";
  if (lower.includes("documentation") || lower.includes("docs")) return "Documentation";
  return null;
}

function addScores(
  scores: Record<Exclude<GovernancePhase, "Needs review">, number>,
  evidence: string[],
  text: string,
  source: keyof typeof SOURCE_WEIGHTS,
) {
  const lower = normalize(text);
  if (!lower.trim()) return;

  for (const [phase, keywords] of Object.entries(KEYWORDS) as Array<[Exclude<GovernancePhase, "Needs review">, string[]]>) {
    const hits = keywords.filter((keyword) => lower.includes(keyword));
    const uniqueHits = [...new Set(hits)];
    if (uniqueHits.length === 0) continue;
    const weightedHits = source === "body" ? uniqueHits.slice(0, 3) : uniqueHits;
    scores[phase] += weightedHits.length * SOURCE_WEIGHTS[source];
    evidence.push(`${source}: ${phase} from ${uniqueHits.slice(0, 5).join(", ")}`);
  }
}

function scorePhases({
  name,
  path,
  metadata,
  body,
  requiredTools,
}: {
  name: string;
  path: string;
  metadata: Record<string, string>;
  body: string;
  requiredTools: string[];
}) {
  const scores: Record<Exclude<GovernancePhase, "Needs review">, number> = {
    "Workflow / Orchestration": 0,
    Planning: 0,
    Build: 0,
    "UI polish": 0,
    "QA / Review": 0,
    Documentation: 0,
  };
  const evidence: string[] = [];

  const frontmatterText = Object.entries(metadata)
    .filter(([key]) => ["name", "description", "phase", "category", "purpose", "triggers"].includes(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const structuredText = extractStructuredSections(body);
  const bodyWithoutStructured = body.replace(structuredText, "");

  const explicit = explicitPhase(`${metadata.phase ?? ""} ${metadata.category ?? ""}`);
  if (explicit) {
    scores[explicit] += 20;
    evidence.push(`frontmatter: explicit phase/category -> ${explicit}`);
  }

  addScores(scores, evidence, `${name} ${path}`, "namePath");
  addScores(scores, evidence, frontmatterText, "frontmatter");
  addScores(scores, evidence, structuredText, "structured");
  addScores(scores, evidence, `${requiredTools.join(" ")} ${structuredText}`, "toolsOutput");
  addScores(scores, evidence, bodyWithoutStructured, "body");

  return {
    scores,
    evidence,
    ranked: (Object.entries(scores) as Array<[Exclude<GovernancePhase, "Needs review">, number]>)
      .map(([phase, score]) => ({ phase, score }))
      .sort((a, b) => b.score - a.score || PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]),
  };
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

function confidenceFrom(top: PhaseScore, second: PhaseScore | undefined, evidenceCount: number) {
  if (top.score === 0) return "Low";
  if (second && top.score - second.score <= 2) return "Low";
  if (top.score >= 18 && evidenceCount >= 2) return "High";
  if (top.score >= 8) return "Medium";
  return "Low";
}

function categoryFrom(phase: GovernancePhase, name: string, text: string): SkillCategory {
  if (phase === "Needs review") return "Needs review";
  const lower = normalize(`${name} ${text}`);

  if (phase === "Planning") {
    if (/(caveman|simplif|context saving|context-saving|terse|minimal)/.test(lower)) return "Simplification / Context-saving";
    if (/(brainstorm|research|ideation|clarify|assumption|strategy)/.test(lower)) return "Ideation / Research";
    return "Governance";
  }
  if (phase === "Build") {
    if (/(frontend|react|next js|tailwind|component|ui implementation|dashboard)/.test(lower)) return "Frontend Engineering";
    return "Engineering";
  }
  if (phase === "UI polish") return "Visual Design / UX Polish";
  if (phase === "QA / Review") return "Verification";
  if (phase === "Documentation") return "Documentation / GitHub";
  if (phase === "Workflow / Orchestration") return "Agent Workflow";
  return "General";
}

function detectRisk(text: string, phase: GovernancePhase, confidence: Confidence): RiskLevel {
  if (confidence === "Low" || phase === "Needs review") return "Needs review";
  const lower = text.toLowerCase();
  if (lower.includes("must") || lower.includes("always") || lower.includes("mandatory") || lower.includes("do not")) return "High";
  if (phase === "Build" || phase === "UI polish" || phase === "Workflow / Orchestration" || lower.includes("modify")) return "Medium";
  return "Low";
}

function reviewReason(top: PhaseScore, second: PhaseScore | undefined) {
  if (top.score === 0) return "No strong deterministic phase signal was found.";
  if (second && top.score - second.score <= 2) {
    return `Top phase scores are too close: ${top.phase} ${top.score}, ${second.phase} ${second.score}.`;
  }
  return "Classifier confidence is low.";
}

export function skillOverrideKey(skill: Pick<ParsedSkill, "source" | "path" | "name">) {
  return `${skill.source}:${skill.path}:${skill.name}`;
}

export function parseSkillDocument(input: SkillFileInput): ParsedSkill {
  const { metadata, body } = parseFrontmatter(input.content);
  const name = slugify(metadata.name || fallbackName(input.path));
  const description = metadata.description || body.split(/\r?\n/).find((line) => line.trim().length > 20)?.trim() || "";
  const requiredTools = detectTools(`${name}\n${description}\n${body}`);
  const { evidence, ranked } = scorePhases({ name, path: input.path, metadata, body, requiredTools });
  const top = ranked[0];
  const second = ranked[1];
  const confidence = confidenceFrom(top, second, evidence.length);
  const phase: GovernancePhase = confidence === "Low" ? "Needs review" : top.phase;
  const analysisText = `${name}\n${description}\n${body}`;
  const category = categoryFrom(phase, name, analysisText);
  const needsReview = phase === "Needs review";
  const needsReviewReason = needsReview ? reviewReason(top, second) : undefined;

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
    needsReview,
    detectedTriggers: evidence,
    requiredTools,
    topScoringPhases: ranked.filter((item) => item.score > 0).slice(0, 4),
    extractedEvidence: evidence,
    decisionReason: needsReview ? needsReviewReason ?? "Needs review." : `${top.phase} selected from weighted deterministic signals.`,
    needsReviewReason,
  };
}

export function applyClassificationOverrides(skills: ParsedSkill[], overrides: ClassificationOverrides): ParsedSkill[] {
  return skills.map((skill) => {
    const override = overrides[skillOverrideKey(skill)] ?? overrides[`${skill.source}:${skill.path}`] ?? overrides[skill.name];
    if (!override) return skill;
    return {
      ...skill,
      phase: override.phase,
      category: override.category,
      confidence: "High",
      needsReview: false,
      riskLevel: detectRisk(`${skill.name}\n${skill.description}`, override.phase, "High"),
      overrideApplied: true,
      decisionReason: `Local override applied for ${skill.path}.`,
      needsReviewReason: undefined,
      extractedEvidence: [`override: ${override.phase} / ${override.category}`, ...skill.extractedEvidence.filter((item) => !item.startsWith("override:"))],
      detectedTriggers: [`override: ${override.phase} / ${override.category}`, ...skill.detectedTriggers.filter((item) => !item.startsWith("override:"))],
    };
  });
}

function sequenceReason(skill: ParsedSkill, brief: ProjectBrief) {
  if (skill.phase === "Workflow / Orchestration") return "Set up routing, handoffs, and governance before phase-specific work begins.";
  if (skill.phase === "UI polish") return "Use after core features exist for final polish and premium interaction details.";
  if (skill.phase === "QA / Review") return "Run after build and polish checks to verify localhost, console, responsive layout, and exports.";
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
      trigger: `${skill.path} has low confidence metadata extraction. ${skill.needsReviewReason ?? ""}`.trim(),
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
