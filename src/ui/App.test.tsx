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

  it("welcomes a new user with the app name, two ways in, no AI mention and a Poison Help tel link", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "GrowSafe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "#/start");
    expect(screen.getByRole("button", { name: "See an example" })).toBeInTheDocument();
    expect(screen.queryByText(/\bAI\b/)).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Poison Help, 1-800-222-1222/ });
    expect(link).toHaveAttribute("href", "tel:+18002221222");
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });
});
