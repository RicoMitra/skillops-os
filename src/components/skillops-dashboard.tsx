"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ClipboardList,
  Download,
  FileSearch,
  FolderOpen,
  Gauge,
  Layers3,
  Library,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  analyzeSkills,
  buildObsidianNote,
  buildPromptExport,
  parseSkillDocument,
  type GovernanceReport,
  type ParsedSkill,
  type ProjectBrief,
  type SkillFileInput,
} from "@/lib/skillops/skillops";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "skillops-os:v1";

const DEFAULT_BRIEF: ProjectBrief = {
  projectType: "Local-first developer tool",
  goal: "Govern local SKILL.md usage for Codex workflows",
  timeline: "MVP in two weeks",
  focus: "Planning, build, UI polish, QA, documentation exports",
  riskTolerance: "low",
};

type StoredState = {
  brief: ProjectBrief;
  skills: ParsedSkill[];
};

type DirectoryHandleLike = {
  name: string;
  values(): AsyncIterable<FileHandleLike | DirectoryHandleLike>;
  requestPermission?: (options?: { mode: "read" }) => Promise<PermissionState>;
  queryPermission?: (options?: { mode: "read" }) => Promise<PermissionState>;
  kind: "directory";
};

type FileHandleLike = {
  name: string;
  kind: "file";
  getFile(): Promise<File>;
};

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
};

function statusTone(status: string) {
  if (status === "Covered") return "text-[var(--success)]";
  if (status === "Missing") return "text-[var(--warning)]";
  return "text-[var(--muted)]";
}

function phaseStatusTone(status: string) {
  if (status === "Covered") return "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]";
  return "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]";
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function collectSkillFilesFromDirectory(handle: DirectoryHandleLike, root = handle.name): Promise<SkillFileInput[]> {
  const files: SkillFileInput[] = [];

  for await (const entry of handle.values()) {
    if (entry.kind === "file" && entry.name.toLowerCase() === "skill.md") {
      const file = await entry.getFile();
      files.push({ path: `${root}/SKILL.md`, source: "directory", content: await file.text() });
    }

    if (entry.kind === "directory") {
      files.push(...(await collectSkillFilesFromDirectory(entry, `${root}/${entry.name}`)));
    }
  }

  return files;
}

function parseStoredState(raw: string | null): StoredState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed.brief || !Array.isArray(parsed.skills)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function mergeSkills(existing: ParsedSkill[], incoming: ParsedSkill[]) {
  const merged = new Map<string, ParsedSkill>();
  for (const skill of existing) merged.set(`${skill.source}:${skill.path}`, skill);
  for (const skill of incoming) merged.set(`${skill.source}:${skill.path}`, skill);
  return [...merged.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="group rounded-[22px] border border-white/10 bg-white/[0.065] p-4 shadow-[0_1px_0_rgb(255_255_255_/_0.10)_inset] transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.085]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/58">{detail}</p>
    </div>
  );
}

function ModuleHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Library;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-[18px] border border-white/10 bg-white/[0.07] text-[var(--accent-light)] shadow-[0_1px_0_rgb(255_255_255_/_0.12)_inset]">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.035em] text-[var(--paper)]">{title}</h2>
        <p className="mt-1 max-w-[72ch] text-sm leading-6 text-[var(--muted)]">{detail}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/46">{label}</span>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SkillPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        tone === "default" && "border-white/10 bg-white/[0.065] text-white/68",
        tone === "success" && "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]",
        tone === "warning" && "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]",
        tone === "danger" && "border-[var(--danger-soft)] bg-[var(--danger-bg)] text-[var(--danger)]",
      )}
    >
      {children}
    </span>
  );
}

export function SkillOpsDashboard() {
  const [brief, setBrief] = useState<ProjectBrief>(DEFAULT_BRIEF);
  const [skills, setSkills] = useState<ParsedSkill[]>([]);
  const [importStatus, setImportStatus] = useState("Select a local folder or upload multiple SKILL.md files for this session.");
  const [directorySupported, setDirectorySupported] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDirectorySupported("showDirectoryPicker" in window);
      const saved = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
      if (saved) {
        setBrief(saved.brief);
        setSkills(saved.skills);
      }
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: StoredState = { brief, skills };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [brief, hydrated, skills]);

  const report: GovernanceReport = useMemo(() => analyzeSkills(skills, brief), [brief, skills]);
  const reviewCount = skills.filter((skill) => skill.needsReview).length;
  const confidentCount = skills.length - reviewCount;
  const chartData = report.coverage.map((item) => ({
    phase: item.phase,
    covered: item.count,
  }));

  const importFiles = async (inputs: SkillFileInput[], statusPrefix: string) => {
    const parsed = inputs.map(parseSkillDocument);
    setSkills((current) => mergeSkills(current, parsed));
    setImportStatus(`${statusPrefix}: ${parsed.length} SKILL.md file${parsed.length === 1 ? "" : "s"} parsed locally and merged into this session.`);
  };

  const chooseDirectory = async () => {
    const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
    if (!picker) {
      setImportStatus("Directory Picker is not available in this browser. Use the upload fallback for this session.");
      uploadRef.current?.click();
      return;
    }

    try {
      const handle = await picker();
      const permission = handle.queryPermission ? await handle.queryPermission({ mode: "read" }) : "granted";
      if (permission !== "granted" && handle.requestPermission) {
        const requested = await handle.requestPermission({ mode: "read" });
        if (requested !== "granted") {
          setImportStatus("Folder permission was not granted. Re-select the folder when ready.");
          return;
        }
      }
      const inputs = await collectSkillFilesFromDirectory(handle);
      await importFiles(inputs, "Recursive directory import");
    } catch (error) {
      setImportStatus(error instanceof Error ? `Directory import cancelled: ${error.message}` : "Directory import cancelled.");
    }
  };

  const uploadFiles = async (fileList: FileList | null) => {
    const selected = Array.from(fileList ?? []).filter((file) => file.name.toLowerCase() === "skill.md" || file.webkitRelativePath.toLowerCase().endsWith("/skill.md"));
    const batchId = Date.now();
    const inputs = await Promise.all(
      selected.map(async (file, index) => ({
        path: file.webkitRelativePath || `upload/${batchId}-${index + 1}-${file.name}`,
        source: "upload" as const,
        content: await file.text(),
      })),
    );
    await importFiles(inputs, "Session upload");
    if (uploadRef.current) uploadRef.current.value = "";
  };

  const reset = () => {
    setBrief(DEFAULT_BRIEF);
    setSkills([]);
    setImportStatus("Local dashboard data cleared. Select a folder or upload SKILL.md files to start again.");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const exportPrompt = () => {
    downloadText("skillops-codex-prompt.md", buildPromptExport({ brief, sequence: report.sequence, warnings: report.warnings, coverage: report.coverage }));
  };

  const exportNote = () => {
    downloadText("skillops-obsidian-note.md", buildObsidianNote({ brief, sequence: report.sequence, warnings: report.warnings, coverage: report.coverage }));
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden p-2 text-[var(--paper)] sm:p-4">
      <div className="mx-auto grid min-h-[calc(100dvh-1rem)] max-w-[1760px] gap-4 lg:grid-cols-[104px_minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.085),rgba(255,255,255,0.035))] p-3 text-white shadow-[var(--shadow-strong)] backdrop-blur-2xl lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]">
          <div className="flex items-center justify-between gap-3 lg:flex-col">
            <div className="grid size-14 place-items-center rounded-[22px] border border-white/12 bg-[linear-gradient(145deg,var(--accent),var(--chrome-2))] text-white shadow-[0_18px_46px_-28px_var(--accent)]">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 lg:hidden">
              <h2 className="text-base font-semibold tracking-tight">SkillOps OS</h2>
              <p className="text-xs text-white/54">Local governance console</p>
            </div>
            <div className="hidden h-px w-10 bg-white/12 lg:block" />
          </div>

          <nav className="mt-4 grid grid-cols-5 gap-1 lg:mt-8 lg:grid-cols-1" aria-label="Dashboard sections">
            {[
              ["Overview", Gauge],
              ["Library", Library],
              ["Sequence", Layers3],
              ["Warnings", AlertTriangle],
              ["Exports", Archive],
            ].map(([label, Icon]) => (
              <a
                key={label as string}
                href={`#${String(label).toLowerCase()}`}
                className="group grid min-h-12 place-items-center rounded-[18px] text-white/48 transition-[background-color,color,transform] duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 active:scale-[0.98]"
                title={label as string}
              >
                <Icon className="size-4.5" aria-hidden="true" />
                <span className="sr-only">{label as string}</span>
              </a>
            ))}
          </nav>

          <div className="mt-auto hidden lg:block">
            <div className="absolute bottom-3 left-3 right-3 rounded-[22px] border border-white/10 bg-white/[0.06] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/42">Local</p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/72">Browser-only analysis</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <section id="overview" className="relative min-h-[calc(100dvh-2rem)] overflow-hidden rounded-[36px] border border-white/10 bg-[var(--chrome)] p-4 text-white shadow-[var(--shadow-strong)] sm:p-6 lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,oklch(0.58_0.16_252_/_0.36),transparent_30rem),radial-gradient(circle_at_12%_84%,oklch(0.48_0.09_210_/_0.24),transparent_24rem),linear-gradient(135deg,transparent,oklch(1_0_0_/_0.065))]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-45" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/22" />

            <div className="relative flex min-h-[calc(100dvh-6rem)] flex-col justify-between gap-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-[16px] border border-white/12 bg-white/[0.08]">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">SkillOps OS</p>
                    <p className="text-xs text-white/48">AI skill governance console</p>
                  </div>
                </div>
                <SkillPill tone="success">No login, no cloud sync, no LLM calls</SkillPill>
              </div>

              <div className="grid items-end gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.62fr)]">
                <div>
                  <h1 className="max-w-[1000px] text-[clamp(3.4rem,7.6vw,8.6rem)] font-semibold leading-[0.86] tracking-[-0.085em] text-white">
                    Govern skills with local control.
                  </h1>
                  <p className="mt-7 max-w-[62ch] text-base leading-7 text-white/68 sm:text-lg">
                    Import many separate SKILL.md files, inspect evidence, sequence the safest workflow, and export Codex-ready governance without server parsing.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    <Button onClick={chooseDirectory}>
                      <FolderOpen className="size-4" aria-hidden="true" />
                      Select skill folder
                    </Button>
                    <Button variant="secondary" className="border-white/14 bg-white/[0.08] text-white hover:bg-white/[0.13]" onClick={() => uploadRef.current?.click()}>
                      <Upload className="size-4" aria-hidden="true" />
                      Upload SKILL.md files
                    </Button>
                    <input
                      ref={uploadRef}
                      className="sr-only"
                      type="file"
                      multiple
                      accept=".md,text/markdown"
                      aria-label="Upload SKILL.md files"
                      onChange={(event) => void uploadFiles(event.target.files)}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.07] p-4 shadow-[0_1px_0_rgb(255_255_255_/_0.10)_inset] backdrop-blur-xl">
                  <div className="flex items-start gap-3">
                    <FileSearch className="mt-1 size-5 shrink-0 text-[var(--accent-light)]" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">Import model</p>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        Directory Picker recursively finds every SKILL.md. Upload fallback accepts multiple files and appends them to the current session.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric label="Imported" value={String(skills.length)} detail={directorySupported ? "Picker ready" : "Upload ready"} />
                    <Metric label="Confident" value={String(confidentCount)} detail="Ready to sequence" />
                    <Metric label="Warnings" value={String(report.warnings.length)} detail="Concrete triggers" />
                    <Metric label="Review" value={String(reviewCount)} detail="Weak metadata" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Current boundary</p>
                  <p className="mt-2 text-sm leading-6 text-white/68">{importStatus}</p>
                </div>
                <a
                  href="#library"
                  className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.07] px-4 text-sm font-semibold text-white/76 transition-[background-color,color,transform] duration-150 hover:bg-white/[0.11] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 active:scale-[0.98]"
                >
                  Open workflow
                </a>
              </div>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
            <Card className="min-w-0 overflow-hidden p-0" id="library">
              <div className="border-b border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <ModuleHeader icon={Library} title="Imported skills" detail="Every row shows source path, classification, confidence, and the exact evidence used by the parser." />
                  <Button variant="ghost" onClick={reset}>
                    <RefreshCcw className="size-4" aria-hidden="true" />
                    Reset local data
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto px-5 pb-5 sm:px-6">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-white/42">
                      <th className="py-4 pr-4 font-semibold">Source and skill</th>
                      <th className="px-4 py-4 font-semibold">Phase</th>
                      <th className="px-4 py-4 font-semibold">Category</th>
                      <th className="px-4 py-4 font-semibold">Risk</th>
                      <th className="px-4 py-4 font-semibold">Confidence</th>
                      <th className="px-4 py-4 font-semibold">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill) => (
                      <tr key={skill.id} className="border-b border-white/[0.07] align-top last:border-0 hover:bg-white/[0.025]">
                        <td className="py-4 pr-4">
                          <p className="font-semibold tracking-[-0.015em] text-white">{skill.displayName}</p>
                          <p className="mt-1 font-mono text-xs text-white/42">{skill.name}</p>
                          <p className="mt-2 max-w-[46ch] truncate font-mono text-xs text-white/48">{skill.path}</p>
                        </td>
                        <td className="px-4 py-4">
                          <SkillPill tone={skill.phase === "Needs review" ? "warning" : "default"}>{skill.phase}</SkillPill>
                        </td>
                        <td className="px-4 py-4 text-white/66">{skill.category}</td>
                        <td className="px-4 py-4">
                          <SkillPill tone={skill.riskLevel === "High" ? "danger" : skill.riskLevel === "Needs review" ? "warning" : "default"}>{skill.riskLevel}</SkillPill>
                        </td>
                        <td className="px-4 py-4">
                          <SkillPill tone={skill.needsReview ? "warning" : "success"}>{skill.needsReview ? "Needs review" : skill.confidence}</SkillPill>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[34ch] space-y-1 text-xs leading-5 text-white/52">
                            {skill.detectedTriggers.length > 0 ? skill.detectedTriggers.map((trigger) => <p key={trigger}>{trigger}</p>) : <p>No strong trigger. Review manually.</p>}
                            {skill.requiredTools.length > 0 && <p>Tools: {skill.requiredTools.join(", ")}</p>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {skills.length === 0 && (
                <div className="mx-5 mb-5 rounded-[28px] border border-dashed border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.035))] p-7 sm:mx-6 sm:mb-6">
                  <div className="grid gap-5 md:grid-cols-[92px_1fr] md:items-center">
                    <div className="grid size-20 place-items-center rounded-[26px] border border-white/12 bg-white/[0.06] text-[var(--accent-light)]">
                      <Library className="size-8" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold tracking-[-0.035em] text-white">Import separate skill files to activate governance</p>
                      <p className="mt-2 max-w-[68ch] text-sm leading-6 text-white/58">
                        Choose `.codex/skills`, `.agents/skills`, or upload multiple SKILL.md files. Raw content is read in the browser and parsed summaries are stored locally.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="min-w-0 p-5 sm:p-6" id="sequence">
                <ModuleHeader icon={SlidersHorizontal} title="Recommended sequence" detail="Confident skills only. General planning first, build second, polish after, QA last." />
                <ol className="mt-6 space-y-3">
                  {report.sequence.map((item) => (
                    <li key={item.id} className="grid grid-cols-[42px_1fr] gap-4 rounded-[24px] border border-white/10 bg-white/[0.045] p-4 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.065]">
                      <span className="grid size-10 place-items-center rounded-[15px] bg-[var(--accent)] font-mono text-sm font-semibold text-white shadow-[0_16px_34px_-24px_var(--accent)]">{item.order}</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold tracking-[-0.015em] text-white">{item.displayName}</p>
                          <SkillPill>{item.phase}</SkillPill>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/58">{item.reason}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {report.sequence.length === 0 && (
                  <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.045] p-5">
                    <p className="font-semibold text-white">Sequence waiting for confidence</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">Import at least one confidently classified skill. Weak files stay in Needs review instead of being guessed into UI/UX.</p>
                  </div>
                )}
              </Card>

              <Card className="min-w-0 p-5 sm:p-6">
                <ModuleHeader icon={ClipboardList} title="Workflow profile" detail="Compact context only. The product work starts in the modules, not a large form." />
                <div className="mt-5 grid gap-3">
                  <Field id="project-type" label="Project type" value={brief.projectType} onChange={(value) => setBrief((current) => ({ ...current, projectType: value }))} />
                  <Field id="project-goal" label="Project goal" value={brief.goal} onChange={(value) => setBrief((current) => ({ ...current, goal: value }))} />
                </div>
              </Card>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,0.86fr)_minmax(0,1.14fr)]">
            <Card className="min-w-0 p-5 sm:p-6" id="warnings">
              <ModuleHeader icon={AlertTriangle} title="Conflict and risk warnings" detail="Only warnings with concrete triggers are shown. Each includes one direct action." />
              <div className="mt-6 space-y-3">
                {report.warnings.map((warning) => (
                  <article key={warning.id} className="rounded-[24px] border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white">{warning.title}</p>
                        <p className="mt-2 text-sm leading-6 text-white/62">Trigger: {warning.trigger}</p>
                        <p className="mt-2 text-sm font-medium text-[var(--warning)]">Action: {warning.recommendedAction}</p>
                      </div>
                    </div>
                  </article>
                ))}
                {report.warnings.length === 0 && (
                  <div className="rounded-[24px] border border-[var(--success-line)] bg-[var(--success-bg)] p-4 text-sm text-[var(--success)]">
                    No deterministic warnings for the current import.
                  </div>
                )}
              </div>
            </Card>

            <Card className="min-w-0 p-5 sm:p-6">
              <ModuleHeader icon={Gauge} title="Governance summary" detail="Coverage is shown as chart and text. Color is never the only signal." />
              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="h-[250px]" aria-label="Governance coverage chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="phase" tick={{ fill: "rgba(242,246,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "rgba(242,246,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ borderRadius: 16, borderColor: "rgba(255,255,255,0.14)", background: "rgb(22, 28, 40)", color: "rgb(242, 246, 255)", boxShadow: "var(--shadow-soft)" }} />
                      <Bar dataKey="covered" fill="var(--accent-light)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid content-start gap-2">
                  {report.coverage.map((item) => (
                    <div key={item.phase} className={cn("flex items-center justify-between rounded-[18px] border px-3 py-2 text-sm", phaseStatusTone(item.status))}>
                      <span className="text-white">{item.phase}</span>
                      <span className={cn("font-semibold", statusTone(item.status))}>{item.status} ({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          <Card className="min-w-0 overflow-hidden p-0" id="exports">
            <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
              <div className="p-5 sm:p-6">
                <ModuleHeader icon={ClipboardList} title="Export local governance artifacts" detail="Downloads are generated in the browser from parsed summaries and current dashboard state." />
                <p className="mt-4 max-w-[65ch] text-sm leading-6 text-white/58">
                  No backend, no shared workspace, no remote skill sharing. Exports are plain Markdown so they can be reviewed before use.
                </p>
              </div>
              <div className="flex flex-col gap-2 border-t border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:min-w-[360px] lg:border-l lg:border-t-0">
                <Button onClick={exportPrompt}>
                  <Download className="size-4" aria-hidden="true" />
                  Export Codex prompt
                </Button>
                <Button variant="secondary" onClick={exportNote}>
                  <Download className="size-4" aria-hidden="true" />
                  Export Obsidian note
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
