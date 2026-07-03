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
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
    </Card>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
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
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)]">
      <div className="grid min-h-[100dvh] lg:grid-cols-[272px_1fr]">
        <aside className="border-b border-[var(--line)] bg-[var(--panel)] px-5 py-5 lg:border-b-0 lg:border-r lg:py-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-[16px] border border-[var(--accent-soft)] bg-[var(--accent-wash)] text-[var(--accent)]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">SkillOps OS</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Local governance</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-1 text-sm" aria-label="Dashboard sections">
            {[
              ["Overview", Gauge],
              ["Library", Library],
              ["Sequence", Layers3],
              ["Warnings", AlertTriangle],
              ["Exports", Archive],
            ].map(([label, Icon]) => (
              <a key={label as string} href={`#${String(label).toLowerCase()}`} className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-warm)] hover:text-[var(--ink)]">
                <Icon className="size-4" aria-hidden="true" />
                {label as string}
              </a>
            ))}
          </nav>

          <div className="mt-8 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-[var(--success)]" aria-hidden="true" />
              Local-only boundary
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              No login, no cloud sync, no LLM calls, no backend scanning, and no automatic SKILL.md changes.
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-6 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">AI Skill Governance OS</p>
              <h1 className="mt-2 max-w-[900px] text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)] md:text-6xl">
                Govern Codex skill workflows before context gets expensive.
              </h1>
              <p className="mt-3 max-w-[65ch] text-base leading-7 text-[var(--muted)]">
                Import local SKILL.md files, classify them deterministically, sequence them by phase, and export governance prompts without sending skill contents to a service.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={chooseDirectory}>
                <FolderOpen className="size-4" aria-hidden="true" />
                Select skill folder
              </Button>
              <Button variant="secondary" onClick={() => uploadRef.current?.click()}>
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
          </header>

          <section id="overview" className="grid gap-4 py-6 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Imported skills" value={String(skills.length)} detail={directorySupported ? "Directory Picker available" : "Upload fallback available"} />
            <Metric label="Sequence steps" value={String(report.sequence.length)} detail="Phase-aware recommendations" />
            <Metric label="Warnings" value={String(report.warnings.length)} detail="Only triggered findings" />
            <Metric label="Needs review" value={String(reviewCount)} detail="Low-confidence metadata" />
          </section>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <Card className="min-w-0 p-5" id="library">
              <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Skill library</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{importStatus}</p>
                </div>
                <Button variant="ghost" onClick={reset}>
                  <RefreshCcw className="size-4" aria-hidden="true" />
                  Reset local data
                </Button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field id="project-type" label="Project type" value={brief.projectType} onChange={(value) => setBrief((current) => ({ ...current, projectType: value }))} />
                <Field id="timeline" label="Timeline" value={brief.timeline} onChange={(value) => setBrief((current) => ({ ...current, timeline: value }))} />
                <Field id="project-goal" label="Project goal" value={brief.goal} onChange={(value) => setBrief((current) => ({ ...current, goal: value }))} />
                <Field id="focus" label="Focus" value={brief.focus} onChange={(value) => setBrief((current) => ({ ...current, focus: value }))} />
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-[var(--line)] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      <th className="py-3 pr-4 font-semibold">Skill</th>
                      <th className="px-4 py-3 font-semibold">Phase</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Risk</th>
                      <th className="px-4 py-3 font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill) => (
                      <tr key={skill.id} className="border-b border-[var(--line-soft)]">
                        <td className="py-4 pr-4">
                          <p className="font-semibold text-[var(--ink)]">{skill.name}</p>
                          <p className="mt-1 max-w-[44ch] truncate text-xs text-[var(--muted)]">{skill.path}</p>
                        </td>
                        <td className="px-4 py-4">{skill.phase}</td>
                        <td className="px-4 py-4">{skill.category}</td>
                        <td className="px-4 py-4">{skill.riskLevel}</td>
                        <td className="px-4 py-4">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", skill.needsReview ? "bg-[var(--warning-bg)] text-[var(--warning)]" : "bg-[var(--success-bg)] text-[var(--success)]")}>
                            {skill.needsReview ? "Needs review" : skill.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {skills.length === 0 && (
                <div className="mt-6 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--surface-warm)] p-8 text-center">
                  <Library className="mx-auto size-8 text-[var(--accent)]" aria-hidden="true" />
                  <p className="mt-3 font-semibold">No skills imported yet</p>
                  <p className="mx-auto mt-2 max-w-[55ch] text-sm leading-6 text-[var(--muted)]">
                    Choose a local skill folder with Directory Picker, or upload SKILL.md files for the current session.
                  </p>
                </div>
              )}
            </Card>

            <Card className="min-w-0 p-5" id="sequence">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Recommended sequence</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Build first, polish later, verify last.</p>
                </div>
                <SlidersHorizontal className="size-5 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <ol className="mt-5 space-y-3">
                {report.sequence.map((item) => (
                  <li key={item.id} className="grid grid-cols-[36px_1fr] gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-warm)] p-3">
                    <span className="grid size-9 place-items-center rounded-full bg-[var(--accent)] font-mono text-sm font-semibold text-[var(--paper)]">{item.order}</span>
                    <div>
                      <p className="font-semibold">{item.displayName}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{item.phase}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {report.sequence.length === 0 && <p className="mt-6 rounded-[18px] bg-[var(--surface-warm)] p-4 text-sm text-[var(--muted)]">Import at least one confidently classified skill to generate a sequence.</p>}
            </Card>
          </div>

          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="min-w-0 p-5" id="warnings">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 size-5 text-[var(--warning)]" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Conflict and risk warnings</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Every warning includes the exact trigger and a single action.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {report.warnings.map((warning) => (
                  <article key={warning.id} className="rounded-[18px] border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4">
                    <p className="text-sm font-semibold text-[var(--ink)]">{warning.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Trigger: {warning.trigger}</p>
                    <p className="mt-2 text-sm font-medium text-[var(--warning)]">Action: {warning.recommendedAction}</p>
                  </article>
                ))}
                {report.warnings.length === 0 && (
                  <div className="rounded-[18px] border border-[var(--success-line)] bg-[var(--success-bg)] p-4 text-sm text-[var(--success)]">
                    No deterministic warnings for the current import.
                  </div>
                )}
              </div>
            </Card>

            <Card className="min-w-0 p-5">
              <h2 className="text-xl font-semibold tracking-tight">Governance coverage</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Phase coverage is textual and charted for quick scanning.</p>
              <div className="mt-5 h-[240px]" aria-label="Governance coverage chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="phase" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "var(--surface-warm)" }} contentStyle={{ borderRadius: 14, borderColor: "var(--line)", color: "var(--ink)" }} />
                    <Bar dataKey="covered" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {report.coverage.map((item) => (
                  <div key={item.phase} className="flex items-center justify-between rounded-[14px] bg-[var(--surface-warm)] px-3 py-2 text-sm">
                    <span>{item.phase}</span>
                    <span className={cn("font-semibold", statusTone(item.status))}>{item.status} ({item.count})</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mt-5 min-w-0 p-5" id="exports">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-1 size-5 text-[var(--accent)]" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Export local governance artifacts</h2>
                  <p className="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--muted)]">
                    Downloads are generated in the browser from parsed summaries and current dashboard state. No backend, no shared workspace, no remote skill sharing.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
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
