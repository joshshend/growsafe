import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App shell", () => {
  it("shows the title, the no-guarantee notice and a Poison Help tel link", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Kid-Proof" })).toBeInTheDocument();
    expect(screen.getByText("Not a guarantee of safety.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Poison Help 1-800-222-1222/ });
    expect(link).toHaveAttribute("href", "tel:+18002221222");
  });
});
