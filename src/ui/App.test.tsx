import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";

describe("App first screen", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useStore.setState({ hydrated: true });
  });

  it("welcomes a new user with a demo button, the disclaimer and a Poison Help tel link", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Kid-Proof" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show me a demo family" })).toBeInTheDocument();
    expect(screen.getByText(/not a guarantee of safety/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Poison Help 1-800-222-1222/ });
    expect(link).toHaveAttribute("href", "tel:+18002221222");
  });
});
