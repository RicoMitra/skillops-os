import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SkillOpsDashboard } from "./skillops-dashboard";

const sampleSkillFile = `---
name: frontend-god-mode
description: Use this skill whenever the user asks to build, create, design, redesign, polish, audit, animate, improve, fix, or make prettier ANY frontend interface.
---

# Frontend God Mode
Use for building React dashboards with Tailwind, accessibility, layout, components, and production UI flows.
`;

const polishSkillFile = `---
name: emil-design-eng
description: Use after the functional UI exists. Polish spacing, typography, animation, transitions, hierarchy, and interaction details.
---

# Emil Design Eng
Use for UI polish after build work is complete.
`;

describe("SkillOpsDashboard", () => {
  it("imports session SKILL.md files, generates sequence, warnings, and exports", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:skillops-export");
    const revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    render(<SkillOpsDashboard />);

    expect(screen.getByRole("heading", { name: /SkillOps OS/i })).toBeInTheDocument();
    expect(screen.getByText(/No login, no cloud sync, no LLM calls/i)).toBeInTheDocument();

    const file = new File([sampleSkillFile], "SKILL.md", { type: "text/markdown" });
    const secondFile = new File([polishSkillFile], "SKILL.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText(/Upload SKILL.md files/i), [file, secondFile]);

    expect(await screen.findByText("frontend-god-mode")).toBeInTheDocument();
    expect(await screen.findByText("emil-design-eng")).toBeInTheDocument();
    expect(screen.getAllByText("Build").length).toBeGreaterThan(0);
    expect(screen.getAllByText("UI polish").length).toBeGreaterThan(0);
    expect(screen.getByText(/Recommended sequence/i)).toBeInTheDocument();
    expect(screen.getByText(/Build selected from weighted deterministic signals/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Export Codex prompt/i }));
    await user.click(screen.getByRole("button", { name: /Export Obsidian note/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it("resets local dashboard data", async () => {
    const user = userEvent.setup();

    render(<SkillOpsDashboard />);

    await user.type(screen.getByLabelText(/Project goal/i), "Keep skill usage disciplined");
    expect(screen.getByDisplayValue(/Keep skill usage disciplined/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Reset local data/i }));
    expect(screen.queryByDisplayValue(/Keep skill usage disciplined/i)).not.toBeInTheDocument();
  });
});
