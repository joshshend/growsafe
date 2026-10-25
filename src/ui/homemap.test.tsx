import { render, screen, within, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

function setup() {
  const s = useStore.getState();
  s.loadDemo();
  const home = useStore.getState().homes[0]!;
  useUi.getState().setActiveChild(useStore.getState().children[0]!.id);
  return home;
}

describe("Home map on Rooms", () => {
  beforeEach(() => {
    window.location.hash = "#/rooms";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("says to start by checking a room when nothing is checked", () => {
    const s = useStore.getState();
    s.addChild("Mia", 1, new Date().getFullYear() - 1);
    s.addHome("Our home", ["kitchen", "nursery"]);
    useUi.getState().setActiveChild(useStore.getState().children[0]!.id);
    render(<App />);
    expect(screen.getByText("Start by checking a room")).toBeInTheDocument();
    const map = screen.getByRole("group", { name: "Map of Our home" });
    expect(within(map).getByRole("link", { name: "Kitchen, not checked" })).toBeInTheDocument();
    // rooms this home does not have are drawn but are not links
    expect(within(map).queryByRole("link", { name: /Bedroom/ })).not.toBeInTheDocument();
  });

  it("each room is a labelled link with its progress, and the summary counts open fixes", () => {
    const home = setup();
    render(<App />);
    const map = screen.getByRole("group", { name: "Map of Our home" });
    const links = within(map).getAllByRole("link");
    expect(links).toHaveLength(home.rooms.length);
    const nursery = links.find((l) => l.getAttribute("aria-label")?.startsWith("Nursery,"))!;
    expect(nursery.getAttribute("aria-label")).toMatch(/^Nursery, \d+ of \d+ done$/);
    expect(screen.getByText(/fixes? open (across|in)/)).toBeInTheDocument();
    // the room list below is still there
    expect(screen.getByRole("heading", { name: "Rooms" })).toBeInTheDocument();
    expect(screen.getByText("We suggest what to fix. You decide.")).toBeInTheDocument();
  });

  it("tapping a room opens it", () => {
    const home = setup();
    render(<App />);
    const map = screen.getByRole("group", { name: "Map of Our home" });
    const kitchen = within(map).getByRole("link", { name: /^Kitchen,/ });
    expect(kitchen.getAttribute("href")).toBe(`#/room/${home.id}/kitchen`);
    fireEvent.click(kitchen);
    expect(screen.getByRole("heading", { level: 1, name: "Kitchen" })).toBeInTheDocument();
  });
});
