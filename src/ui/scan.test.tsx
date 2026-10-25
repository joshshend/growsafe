import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.length).toBeGreaterThan(1);
    // The sample family is pre-checked, so earlier taps are already ticked. Add one more.
    const off = boxes.find((b) => !b.checked)!;
    fireEvent.click(off);
    fireEvent.click(screen.getByRole("button", { name: /^Add \d+ to my list$/ }));
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
    expect(screen.getByRole("link", { name: "What's in this room" })).toBeInTheDocument();
  });
});

describe("photo scan layer", () => {
  const room = () => {
    useStore.getState().loadDemo();
    window.location.hash = "#/scan?home=demo-home&room=living_room";
  };
  const serverUp = (provider = "gemini") =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("sample-room")) throw new TypeError("offline");
        return new Response("{}", { headers: { "X-Provider": provider } });
      }),
    );
  afterEach(() => vi.unstubAllGlobals());

  it("is hidden when the server has no key", async () => {
    room();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Room check" });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: "Scan a photo" })).toBeNull();
  });

  it("asks for consent first, names the provider, and declining keeps the tap list", async () => {
    room();
    serverUp("gemini");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Scan a photo" }));
    expect(screen.getByText(/sends your photo to Google's Gemini/)).toBeInTheDocument();
    expect(useStore.getState().settings.perceptionConsent).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Use the tap list instead" }));
    expect(useStore.getState().settings.perceptionConsent).toBe(false);
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(1);
  });

  it("sample photo works offline: consent, then a labelled sample result that feeds the tap list", async () => {
    room();
    serverUp();
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Try a sample photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Agree and continue" }));
    expect(await screen.findByText("Sample result")).toBeInTheDocument();
    expect(useStore.getState().settings.perceptionConsent).toBe(true);
    const chips = screen.getAllByRole("button", { pressed: true });
    expect(chips.length).toBeGreaterThan(0);
    fireEvent.click(chips[0]!); // untick one
    fireEvent.click(screen.getByRole("button", { name: "Use these" }));
    expect(screen.getByText(/Added to the tap list below/)).toBeInTheDocument();
  });
});
