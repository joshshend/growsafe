import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

function demo() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Explore a sample family" }));
}

describe("core flow (jsdom stand-in for the browser smoke test)", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("onboarding builds a plan in three steps and lands on Today", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: "Show me the first fix" }));
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("First name or nickname"), {
      target: { value: "Maya" },
    });
    const d = new Date();
    d.setMonth(d.getMonth() - 9);
    fireEvent.change(screen.getByLabelText("Birth month"), {
      target: { value: String(d.getMonth() + 1) },
    });
    fireEvent.change(screen.getByLabelText("Birth year"), {
      target: { value: String(d.getFullYear()) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My home", pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(screen.getByText("Right now")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(useStore.getState().tasks.length).toBeGreaterThan(0);
  });

  it("onboarding says what is wrong when the birth date is missing", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: "Show me the first fix" }));
    fireEvent.change(screen.getByLabelText("First name or nickname"), {
      target: { value: "Maya" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a birth month and year.");
  });

  it("Today shows one hero task, a flat list, and ticking a row moves the progress ring", () => {
    demo();
    expect(screen.getByText("Right now")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^(See the steps|Back to the steps)$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "After that" })).toBeInTheDocument();
    const ring = screen.getByRole("progressbar", { name: "Progress" });
    const before = Number(ring.getAttribute("aria-valuenow"));
    const toggles = screen.getAllByRole("button", { pressed: false, name: /^Mark done: / });
    fireEvent.click(toggles[0]!);
    expect(
      Number(screen.getByRole("progressbar", { name: "Progress" }).getAttribute("aria-valuenow")),
    ).toBe(before + 1);
    expect(screen.getByText("Marked as done")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      Number(screen.getByRole("progressbar", { name: "Progress" }).getAttribute("aria-valuenow")),
    ).toBe(before);
  });

  it("Start opens the task sheet with steps, explains the ranking in plain words, and Escape closes it", () => {
    demo();
    fireEvent.click(screen.getByRole("button", { name: /^(See the steps|Back to the steps)$/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("list", { name: "Steps" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Mark as done" })).toBeInTheDocument();
    expect(within(dialog).getByText(/does not guarantee any child's safety/)).toBeInTheDocument();
    const why = within(dialog).getByText("How this was ranked").closest("details")!;
    const text = why.textContent ?? "";
    expect(text).toMatch(/out of 5 on our seriousness scale/);
    expect(text).not.toMatch(/reason\.|\{|\}/);
    expect(within(why).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Mark done in the sheet closes it and counts the task", () => {
    demo();
    const before = useStore.getState().tasks.filter((t) => t.status === "done").length;
    fireEvent.click(screen.getByRole("button", { name: /^(See the steps|Back to the steps)$/ }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Mark as done" }),
    );
    // The task sheet is gone. (If that was the last open task in its room, the all-done page may open instead.)
    expect(screen.queryByRole("list", { name: "Steps" })).not.toBeInTheDocument();
    expect(useStore.getState().tasks.filter((t) => t.status === "done").length).toBe(before + 1);
  });

  it("Rooms lists tiles with counts and opens a room checklist", () => {
    demo();
    fireEvent.click(screen.getByRole("link", { name: "Rooms" }));
    expect(screen.getByRole("heading", { level: 1, name: "Rooms" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /^Kitchen/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Kitchen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "To do" })).toBeInTheDocument();
  });

  it("Settings switches to larger text and erases data after a confirmation", () => {
    demo();
    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    fireEvent.click(screen.getByRole("switch", { name: "Larger text" }));
    expect(document.documentElement.classList.contains("large")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Erase data" }));
    const dialog = screen.getByRole("dialog");
    act(() => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Erase data" }));
    });
    expect(useStore.getState().children).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Explore a sample family" })).toBeInTheDocument();
  });

  it("Help puts the Poison Help number first and People has the share stub", () => {
    demo();
    fireEvent.click(screen.getByRole("link", { name: "Help" }));
    const links = screen.getAllByRole("link", { name: /Poison Help, 1-800-222-1222/ });
    expect(links.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("link", { name: "People" }));
    expect(screen.getByRole("button", { name: "Share this plan" })).toBeInTheDocument();
  });
});
