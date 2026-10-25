import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("Reminders", () => {
  let blobs: Blob[];
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
    blobs = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return "blob:x";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("explains plainly, then downloads a weekly + monthly + plan .ics", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Explore a sample family" }));
    fireEvent.click(screen.getByRole("link", { name: /Check-in reminders/ })); // Today footer link
    expect(screen.getByRole("heading", { level: 1, name: "Reminders" })).toBeVisible();
    expect(screen.getByText(/your own calendar app/)).toBeInTheDocument();
    expect(screen.getByText(/can't send notifications/)).toBeInTheDocument();
    expect(screen.getByText("1 event will be added")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Kitchen" }));
    fireEvent.click(screen.getByRole("switch", { name: /When a child reaches a new age/ }));
    expect(screen.getByText(/events will be added/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));

    expect(blobs).toHaveLength(1);
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(blobs[0]!);
    });
    expect(text).toContain("RRULE:FREQ=WEEKLY;BYDAY=SA");
    expect(text).toMatch(/RRULE:FREQ=MONTHLY;BYDAY=1SA/);
    expect(text).toContain("SUMMARY:Weekly: 10-minute GrowSafe check-in");
    expect(text).toContain("SUMMARY:Monthly: re-check the kitchen");
    expect(text).toMatch(/SUMMARY:Update your plan: Mia turns/);
    expect(text).toMatch(/DTSTART:\d{8}T090000\r\n/);
  });

  it("switching everything off disables the button", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Explore a sample family" }));
    fireEvent.click(screen.getByRole("link", { name: /Check-in reminders/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Repeat every week/ }));
    expect(screen.getByText("Choose at least one reminder above.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeDisabled();
  });
});
