import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("Plan my weekend", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("goes from the Today card to a plan whose checkboxes share task state", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Explore a sample family" }));
    fireEvent.click(screen.getByRole("link", { name: /Plan a safety session/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Plan a safety session" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "2 hr" }));
    fireEvent.click(screen.getByRole("button", { name: "No limit" }));
    fireEvent.click(screen.getByRole("button", { name: "Make my plan" }));

    expect(screen.getByRole("heading", { level: 1, name: "Your session" })).toBeVisible();
    expect(screen.getByText(/A priority order, not a prediction/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Tasks in order" });
    const doneCount = () => useStore.getState().tasks.filter((t) => t.status === "done").length;
    const before = doneCount();
    const toggles = within(list).getAllByRole("button", { pressed: false, name: /^Mark done: / });
    fireEvent.click(toggles[0]!);
    expect(doneCount()).toBe(before + 1);
  });
});
