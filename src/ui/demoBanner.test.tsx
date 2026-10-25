import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

const BANNER = "You're exploring an example family (Mia and Noah).";

describe("demo banner and Emergency pill", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({
      activeChildId: null,
      openTaskId: null,
      switcherOpen: false,
      toast: null,
      demoBannerDismissed: false,
    });
    useStore.setState({ hydrated: true });
  });

  it("shows no Emergency pill on Welcome or Onboarding", () => {
    render(<App />);
    expect(screen.queryByRole("link", { name: "Emergency help" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Show me the first fix" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Emergency help" })).not.toBeInTheDocument();
  });

  it("links the Emergency pill to Help once there is a family", () => {
    useStore.getState().loadDemo();
    render(<App />);
    expect(screen.getByRole("link", { name: "Emergency help" })).toHaveAttribute("href", "#/help");
  });

  it("shows on Today and Rooms for the demo, dismisses, and Start my own clears the demo", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Explore a sample family" }));
    expect(screen.getByText(BANNER)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Rooms" }));
    expect(screen.getByText(BANNER)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();

    act(() => useUi.setState({ demoBannerDismissed: false }));
    fireEvent.click(screen.getByRole("button", { name: "Start my own" }));
    expect(useStore.getState().children).toHaveLength(0);
    expect(window.location.hash).toBe("#/start");
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });
});
