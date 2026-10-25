import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("App first screen", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
  });

  it("welcomes a new user with the app name, two ways in, no AI mention and no header Emergency pill", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "A safer home, one small fix at a time." }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("GrowSafe").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Show me the first fix" })).toHaveAttribute(
      "href",
      "#/start",
    );
    expect(screen.getByRole("button", { name: "Explore a sample family" })).toBeInTheDocument();
    expect(screen.queryByText(/\bAI\b/)).not.toBeInTheDocument();
    expect(
      screen.getByText("See GrowSafe with an example family. You can start your own anytime."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Emergency help" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });
});
