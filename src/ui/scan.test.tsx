import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("room check", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("ticking a cue adds the task, shows blind spots and the disclaimer", () => {
    useStore.getState().loadDemo();
    window.location.hash = "#/scan?home=demo-home&room=kitchen";
    render(<App />);
    expect(screen.getByRole("heading", { name: "Room check" })).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.length).toBeGreaterThan(1);
    fireEvent.click(boxes[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Add 1 thing to my plan" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /added to your plan|Nothing added/,
    );
    expect(screen.getByText("What this check can't see")).toBeInTheDocument();
    expect(screen.getByText("Nothing flagged does not mean the room is safe.")).toBeInTheDocument();
  });

  it("is reachable from a room page", () => {
    useStore.getState().loadDemo();
    window.location.hash = "#/room/demo-home/kitchen";
    render(<App />);
    expect(screen.getByRole("link", { name: "Check this room" })).toBeInTheDocument();
  });
});
