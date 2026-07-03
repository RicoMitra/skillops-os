"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  Download,
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_1px_0_rgb(255_255_255_/_0.08)_inset]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/52">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-white">{value}</p>
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
      <div className="grid size-10 shrink-0 place-items-center rounded-[14px] border border-[var(--line)] bg-[var(--surface)] text-[var(--accent)] shadow-[0_1px_0_oklch(1_0_0_/_0.8)_inset]">
        <Icon className="size-4.5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.025em] text-[var(--ink)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{detail}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  tone = "light",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  tone?: "light" | "dark";
}) {
  return (
    <label htmlFor={id} className="block">
      <span className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em]", tone === "dark" ? "text-white/58" : "text-[var(--muted)]")}>{label}</span>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function SkillOpsDashboard() {
  const [brief, setBrief] = useState<ProjectBrief>(DEFAULT_BRIEF);
  const [skills, setSkills] = useState<ParsedSkill[]>([]);
  const [importStatus, setImportStatus] = useState("Select a local folder or upload SKILL.md files for this session.");
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
  const chartData = report.coverage.map((item) => ({
    phase: item.phase,
    covered: item.count,
  }));

  const importFiles = async (inputs: SkillFileInput[], statusPrefix: string) => {
    const parsed = inputs.map(parseSkillDocument);
    setSkills(parsed);
    setImportStatus(`${statusPrefix}: ${parsed.length} SKILL.md file${parsed.length === 1 ? "" : "s"} parsed locally.`);
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
      await importFiles(inputs, "Directory import");
    } catch (error) {
      setImportStatus(error instanceof Error ? `Directory import cancelled: ${error.message}` : "Directory import cancelled.");
    }
  };

  const uploadFiles = async (fileList: FileList | null) => {
    const selected = Array.from(fileList ?? []).filter((file) => file.name.toLowerCase() === "skill.md");
    const inputs = await Promise.all(
      selected.map(async (file) => ({
        path: file.webkitRelativePath || file.name,
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
    <div className="min-h-[100dvh] overflow-x-hidden p-2 text-[var(--ink)] sm:p-4">
      <div className="mx-auto grid min-h-[calc(100dvh-1rem)] max-w-[1720px] gap-4 lg:grid-cols-[104px_minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-[var(--chrome-line)] bg-[var(--chrome)] p-3 text-white shadow-[var(--shadow-strong)] lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]">
          <div className="flex items-center justify-between gap-3 lg:flex-col">
            <div className="grid size-14 place-items-center rounded-[22px] border border-white/12 bg-white/[0.08] text-white shadow-[0_1px_0_rgb(255_255_255_/_0.10)_inset]">
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
          <section id="overview" className="relative overflow-hidden rounded-[34px] border border-[var(--chrome-line)] bg-[var(--chrome)] p-4 text-white shadow-[var(--shadow-strong)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,oklch(0.58_0.16_252_/_0.34),transparent_28rem),linear-gradient(135deg,transparent,oklch(1_0_0_/_0.06))]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />
            <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
              <div className="flex min-h-[430px] flex-col justify-between gap-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/74">SkillOps OS</span>
                    <span className="rounded-full border border-[var(--success-line)] bg-[var(--success-bg)] px-3 py-1 text-xs font-semibold text-[var(--success)]">All core logic stays local</span>
                  </div>
                  <h1 className="mt-7 max-w-[920px] text-[clamp(2.8rem,6vw,6.7rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-white">
                    Govern skills before they govern the work.
                  </h1>
                  <p className="mt-6 max-w-[58ch] text-base leading-7 text-white/68">
                    Import local SKILL.md files, classify them deterministically, sequence them by phase, and export governance prompts without sending skill contents to a service.
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={chooseDirectory}>
                      <FolderOpen className="size-4" aria-hidden="true" />
                      Select skill folder
                    </Button>
                    <Button variant="secondary" className="border-white/14 bg-white/[0.08] text-white hover:bg-white/[0.13]" onClick={() => uploadRef.current?.click()}>
                      <Upload className="size-4" aria-hidden="true" />
                      Upload fallback
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
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Imported skills" value={String(skills.length)} detail={directorySupported ? "Directory Picker ready" : "Upload fallback ready"} />
                    <Metric label="Sequence steps" value={String(report.sequence.length)} detail="Phase-aware order" />
                    <Metric label="Warnings" value={String(report.warnings.length)} detail="Triggered only" />
                    <Metric label="Needs review" value={String(reviewCount)} detail="Low confidence" />
                  </div>
                </div>
              </div>

              <Card className="relative min-w-0 overflow-hidden border-white/10 bg-white/[0.08] p-4 text-white shadow-none sm:p-5">
                <div className="absolute inset-x-0 top-0 h-px bg-white/18" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/48">Project brief</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Local workflow command file</h2>
                  </div>
                  <Button variant="ghost" className="border border-white/10 bg-white/[0.05] text-white/72 hover:bg-white/[0.1] hover:text-white" onClick={reset}>
                    <RefreshCcw className="size-4" aria-hidden="true" />
                    Reset
                  </Button>
                </div>
                <div className="mt-6 grid gap-3">
                  <Field id="project-type" label="Project type" tone="dark" value={brief.projectType} onChange={(value) => setBrief((current) => ({ ...current, projectType: value }))} />
                  <Field id="project-goal" label="Project goal" tone="dark" value={brief.goal} onChange={(value) => setBrief((current) => ({ ...current, goal: value }))} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="timeline" label="Timeline" tone="dark" value={brief.timeline} onChange={(value) => setBrief((current) => ({ ...current, timeline: value }))} />
                    <Field id="focus" label="Focus" tone="dark" value={brief.focus} onChange={(value) => setBrief((current) => ({ ...current, focus: value }))} />
                  </div>
                </div>
                <div className="mt-6 rounded-[20px] border border-[var(--success-line)] bg-[var(--success-bg)] p-4 text-[var(--success)]">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Local-only boundary
                  </p>
                  <p className="mt-2 text-xs leading-5">
                    No login, no cloud sync, no LLM calls, no backend scanning, and no automatic SKILL.md changes.
                  </p>
                </div>
              </Card>
            </div>
          </section>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
            <Card className="min-w-0 overflow-hidden p-0" id="library">
              <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,var(--surface),var(--surface-warm))] p-5 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <ModuleHeader icon={Library} title="Imported skills" detail={importStatus} />
                  <Button variant="ghost" onClick={reset}>
                    <RefreshCcw className="size-4" aria-hidden="true" />
                    Reset local data
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto px-5 pb-5 sm:px-6">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      <th className="py-4 pr-4 font-semibold">Skill</th>
                      <th className="px-4 py-4 font-semibold">Phase</th>
                      <th className="px-4 py-4 font-semibold">Category</th>
                      <th className="px-4 py-4 font-semibold">Risk</th>
                      <th className="px-4 py-4 font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill) => (
                      <tr key={skill.id} className="border-b border-[var(--line-soft)] last:border-0">
                        <td className="py-4 pr-4">
                          <p className="font-semibold tracking-[-0.015em] text-[var(--ink)]">{skill.name}</p>
                          <p className="mt-1 max-w-[44ch] truncate font-mono text-xs text-[var(--muted)]">{skill.path}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-warm)] px-2.5 py-1 text-xs font-semibold">{skill.phase}</span>
                        </td>
                        <td className="px-4 py-4 text-[var(--muted)]">{skill.category}</td>
                        <td className="px-4 py-4 text-[var(--muted)]">{skill.riskLevel}</td>
                        <td className="px-4 py-4">
                          <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", skill.needsReview ? "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]" : "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]")}>
                            {skill.needsReview ? "Needs review" : skill.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {skills.length === 0 && (
                <div className="mx-5 mb-5 rounded-[24px] border border-dashed border-[var(--line)] bg-[linear-gradient(135deg,var(--surface),var(--surface-warm))] p-7 sm:mx-6 sm:mb-6">
                  <div className="grid gap-5 md:grid-cols-[92px_1fr] md:items-center">
                    <div className="grid size-20 place-items-center rounded-[28px] border border-[var(--line)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
                      <Library className="size-8" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.025em]">Import a skill root to activate governance</p>
                      <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[var(--muted)]">
                        Choose `.codex/skills`, `.agents/skills`, or upload SKILL.md files for this session. The dashboard reads locally and stores parsed summaries only.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="min-w-0 p-5 sm:p-6" id="sequence">
              <div className="flex items-start justify-between gap-4">
                <ModuleHeader icon={SlidersHorizontal} title="Recommended sequence" detail="Build first, polish later, verify last." />
              </div>
              <ol className="mt-6 space-y-3">
                {report.sequence.map((item) => (
                  <li key={item.id} className="grid grid-cols-[42px_1fr] gap-4 rounded-[22px] border border-[var(--line)] bg-[linear-gradient(135deg,var(--surface),var(--surface-warm))] p-4">
                    <span className="grid size-10 place-items-center rounded-[14px] bg-[var(--chrome)] font-mono text-sm font-semibold text-white shadow-[0_12px_28px_-20px_var(--chrome)]">{item.order}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-[-0.015em]">{item.displayName}</p>
                        <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-wash)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">{item.phase}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {report.sequence.length === 0 && (
                <div className="mt-6 rounded-[22px] border border-[var(--line)] bg-[var(--surface-warm)] p-5">
                  <p className="font-semibold">Sequence waiting for signal</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Import at least one confidently classified skill to generate a phase-aware workflow.</p>
                </div>
              )}
            </Card>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
            <Card className="min-w-0 p-5 sm:p-6" id="warnings">
              <ModuleHeader icon={AlertTriangle} title="Conflict and risk warnings" detail="Low-noise findings with exact triggers and one recommended action." />
              <div className="mt-6 space-y-3">
                {report.warnings.map((warning) => (
                  <article key={warning.id} className="rounded-[22px] border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">{warning.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Trigger: {warning.trigger}</p>
                        <p className="mt-2 text-sm font-medium text-[var(--warning)]">Action: {warning.recommendedAction}</p>
                      </div>
                    </div>
                  </article>
                ))}
                {report.warnings.length === 0 && (
                  <div className="rounded-[22px] border border-[var(--success-line)] bg-[var(--success-bg)] p-4 text-sm text-[var(--success)]">
                    No deterministic warnings for the current import.
                  </div>
                )}
              </div>
            </Card>

            <Card className="min-w-0 p-5 sm:p-6">
              <ModuleHeader icon={Gauge} title="Governance summary" detail="Phase coverage is charted and listed so color is never the only signal." />
              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="h-[250px]" aria-label="Governance coverage chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                      <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                      <XAxis dataKey="phase" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "var(--surface-warm)" }} contentStyle={{ borderRadius: 16, borderColor: "var(--line)", color: "var(--ink)", boxShadow: "var(--shadow-soft)" }} />
                      <Bar dataKey="covered" fill="var(--accent)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid content-start gap-2">
                  {report.coverage.map((item) => (
                    <div key={item.phase} className={cn("flex items-center justify-between rounded-[16px] border px-3 py-2 text-sm", phaseStatusTone(item.status))}>
                      <span className="text-[var(--ink)]">{item.phase}</span>
                      <span className={cn("font-semibold", statusTone(item.status))}>{item.status} ({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card className="min-w-0 overflow-hidden p-0" id="exports">
            <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
              <div className="p-5 sm:p-6">
                <ModuleHeader icon={ClipboardList} title="Export local governance artifacts" detail="Downloads are generated in the browser from parsed summaries and current dashboard state." />
                <p className="mt-4 max-w-[65ch] text-sm leading-6 text-[var(--muted)]">
                  No backend, no shared workspace, no remote skill sharing. Exports are plain Markdown so they can be reviewed before use.
                </p>
              </div>
              <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--surface-warm)] p-5 sm:p-6 lg:min-w-[360px] lg:border-l lg:border-t-0">
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
