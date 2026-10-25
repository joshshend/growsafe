import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { loadMilestones, loadStageNotes, stageNoteErrors } from "../kb/stages";
import stagesRaw from "../kb/stages.json";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("Today: coming up strip", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("sits above 'Right now' for the sample family and links to the 18-month preview", () => {
    useStore.getState().loadDemo(); // Mia is 9 months
    render(<App />);
    const strip = screen.getByRole("region", { name: "Coming up for Mia" });
    expect(within(strip).getByText("Around 12 months:")).toBeInTheDocument();
    expect(within(strip).getByText(/pulling up to stand/)).toBeInTheDocument();
    expect(within(strip).getByText(/New by then: .*Garage/)).toBeInTheDocument();
    expect(within(strip).getByRole("link", { name: "See the next 18 months" })).toHaveAttribute(
      "href",
      "#/ahead",
    );
    expect(within(strip).getByRole("link", { name: "Source: CDC milestones" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^https:\/\/www\.cdc\.gov\//),
    );
    const right = screen.getByText("Right now");
    expect(strip.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(strip.textContent).not.toMatch(/\bsafe\b/i);
  });
});

describe("stage milestones", () => {
  it("validate and cover every stage with an https CDC page", () => {
    expect(stageNoteErrors(stagesRaw)).toEqual([]);
    expect(loadStageNotes().size).toBe(6);
    const all = loadMilestones();
    expect(all.length).toBeGreaterThan(8);
    for (const m of all) expect(m.url).toMatch(/^https:\/\/www\.cdc\.gov\/act-early\/milestones\//);
    expect(all.map((m) => m.months)).toEqual([...all.map((m) => m.months)].sort((a, b) => a - b));
  });
  it("rejects a milestone that sits in the wrong stage", () => {
    const bad = JSON.parse(JSON.stringify(stagesRaw));
    bad[0].milestones[0].months = 12;
    expect(stageNoteErrors(bad).join(" ")).toMatch(/outside the stage/);
  });
});
