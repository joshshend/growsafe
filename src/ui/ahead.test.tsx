import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { birthFor, useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("Growth preview", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("moves the child forward, announces it, and adds upcoming tasks to the plan", () => {
    const b = birthFor(9, new Date());
    useStore.getState().addChild("Mia", b.month, b.year);
    useStore.getState().addHome("Home", ["living_room", "kitchen", "garage"]);
    window.location.hash = "#/ahead";
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "What's coming up" })).toBeVisible();
    const slider = screen.getByRole("slider", { name: "Age to preview" });
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringMatching(/^Mia at /));

    fireEvent.click(screen.getByRole("button", { name: "One month older" }));
    expect(slider).toHaveValue("1");
    fireEvent.change(slider, { target: { value: "18" } });
    expect(slider).toHaveValue("18");
    expect(screen.getByRole("heading", { name: "Timeline" })).toBeVisible();
    expect(screen.getByText(/does not guarantee any child's safety/)).toBeInTheDocument();

    const before = useStore.getState().tasks.length;
    fireEvent.click(screen.getByRole("button", { name: /^Add \d+ tasks? to my plan now$/ }));
    expect(useStore.getState().tasks.length).toBeGreaterThan(before);
    expect(screen.getByText(/already in your plan/)).toBeInTheDocument();
  });
});
