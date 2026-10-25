import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

function family() {
  const now = new Date();
  const s = useStore.getState();
  const id = s.addChild("Mia", now.getMonth() + 1, now.getFullYear() - 1);
  const homeId = s.addHome("Our home", ["kitchen", "bathroom"]);
  useUi.getState().setActiveChild(id);
  return { id, homeId };
}

describe("rooms start unchecked", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("Today asks you to start with one room and shows no hazard tasks", () => {
    const { homeId } = family();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Start with one room" })).toBeInTheDocument();
    expect(screen.queryByText("Right now")).not.toBeInTheDocument();
    const go = screen.getByRole("link", { name: "Check Kitchen" });
    expect(go).toHaveAttribute("href", `#/scan?home=${homeId}&room=kitchen`);
    expect(screen.getByRole("link", { name: "Photograph a room" })).toBeInTheDocument();
  });

  it("Rooms says Not checked yet with a Check this room action", () => {
    family();
    window.location.hash = "#/rooms";
    render(<App />);
    expect(screen.getAllByText("Not checked yet")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Check this room" })).toHaveLength(2);
  });

  it("the tap list creates tasks and only that room becomes checked", () => {
    const { homeId } = family();
    window.location.hash = `#/scan?home=${homeId}&room=kitchen`;
    render(<App />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByRole("button", { name: /^Add \d+ to my list$/ }));
    const s = useStore.getState();
    expect(s.tasks.length).toBeGreaterThan(0);
    expect(s.homes[0]!.checks?.kitchen?.checkedAt).toBeTruthy();
    expect(s.homes[0]!.checks?.bathroom).toBeUndefined();
  });

  it("'Nothing here needs fixing' checks a room with zero tasks", () => {
    const { homeId } = family();
    window.location.hash = `#/room/${homeId}/kitchen`;
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Nothing here needs fixing" }));
    const s = useStore.getState();
    expect(s.tasks).toHaveLength(0);
    expect(s.homes[0]!.checks?.kitchen).toBeDefined();
    expect(screen.getByText("Checked. Nothing to fix here.")).toBeInTheDocument();
  });

  it("the sample family is pre-checked and full", () => {
    useStore.getState().loadDemo();
    const h = useStore.getState().homes[0]!;
    expect(h.rooms.every((r) => h.checks?.[r])).toBe(true);
    expect(useStore.getState().tasks.length).toBeGreaterThan(10);
    render(<App />);
    expect(screen.getByText("Right now")).toBeInTheDocument();
  });
});
