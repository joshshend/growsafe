import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useEmergency } from "../emergency/store";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

function demo(hash: string) {
  window.location.hash = "#/";
  useStore.getState().reset();
  useEmergency.getState().reset();
  useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
  useStore.setState({ hydrated: true });
  useStore.getState().loadDemo();
  window.location.hash = hash;
  render(<App />);
}

describe("T6 screens", () => {
  beforeEach(() => document.body.replaceChildren());

  it("saves an emergency card on this device and says so", async () => {
    demo("#/emergency/demo-mia");
    expect(screen.getByText(/Stays on this phone/)).toBeInTheDocument();
    await screen.findByLabelText("Allergies");
    fireEvent.change(screen.getByLabelText("Allergies"), { target: { value: "Peanuts" } });
    fireEvent.click(screen.getByRole("button", { name: "Save on this phone" }));
    expect(useEmergency.getState().cards["demo-mia"]?.allergies).toBe("Peanuts");
    expect(JSON.stringify(useStore.getState())).not.toContain("Peanuts");
  });

  it("medicine check: answering yes to every item completes the medicine tasks", async () => {
    demo("#/medicine/demo-home");
    await screen.findByText(/Medicines, vitamins and supplements/);
    const med = () => useStore.getState().tasks.filter((t) => t.hazard_id === "medicine-storage");
    expect(med().length).toBeGreaterThan(0);
    const group = screen.getByRole("heading", {
      name: "Medicines, vitamins and supplements",
    }).parentElement!;
    for (const b of Array.from(group.querySelectorAll("button")).filter((x) =>
      x.textContent?.startsWith("Yes"),
    ))
      act(() => {
        fireEvent.click(b);
      });
    expect(med().every((t) => t.status === "done")).toBe(true);
  });

  it("briefing shows Poison Help and 911 and only adds the card when toggled", async () => {
    demo("#/briefing/demo-home");
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Sitter briefing");
    expect(screen.getByRole("link", { name: /Poison Help \(free/ })).toBeInTheDocument();
    expect(screen.getByText(/call 911/)).toBeInTheDocument();
    expect(screen.queryByText("Emergency card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Include emergency card/ }));
    expect(screen.getByText("Emergency card")).toBeInTheDocument();
  });
});
