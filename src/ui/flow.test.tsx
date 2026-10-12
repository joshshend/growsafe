import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";

describe("core flow (jsdom stand-in for the browser smoke test)", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useStore.setState({ hydrated: true });
  });

  it("demo -> plan groups -> toggle done -> task detail explains the ranking in plain words", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Show me a demo family" }));
    expect(screen.getByRole("heading", { level: 1, name: "Your plan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Do first/ })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progress" })).toHaveAttribute(
      "aria-valuenow",
      "2",
    );

    const toggles = screen.getAllByRole("button", { pressed: false, name: /^Done: / });
    fireEvent.click(toggles[0]!);
    expect(screen.getByRole("progressbar", { name: "Progress" })).toHaveAttribute(
      "aria-valuenow",
      "3",
    );

    const link = document.querySelector("a.task-main") as HTMLAnchorElement;
    fireEvent.click(link);
    const panel = screen.getByRole("heading", { name: "Why this ranks here" }).closest("section")!;
    const text = panel.textContent ?? "";
    expect(text).toMatch(/out of 5 on our seriousness scale/);
    expect(text).not.toMatch(/reason\.|\{|\}/);
    expect(within(panel).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });

  it("filters by room and links to the room checklist", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Show me a demo family" }));
    fireEvent.click(screen.getByRole("button", { name: /^Kitchen/ }));
    fireEvent.click(screen.getByRole("link", { name: /Open Kitchen checklist/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Kitchen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checklist" })).toBeInTheDocument();
  });
});
