import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../ui/App";
import { useStore } from "../store/store";
import { useUi } from "../ui/ui-state";

describe("gear UI", () => {
  beforeEach(() => {
    window.location.hash = "#/rooms";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
    useStore.getState().loadDemo();
  });

  it("adds a crib, runs the checklist, and a 'No' becomes a task", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add gear" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save gear" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter the brand.");
    fireEvent.change(within(dialog).getByLabelText("Brand"), { target: { value: "Graco" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes" })); // second-hand
    fireEvent.click(within(dialog).getByRole("button", { name: "Save gear" }));
    expect(screen.getByText("Graco Crib")).toBeInTheDocument();
    expect(screen.getByText("Not checked")).toBeInTheDocument();
    expect(screen.getByText("Second-hand")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run checklist" }));
    const list = screen.getByRole("dialog");
    const group = within(list).getByRole("group", { name: /no more than 2-3\/8 inches/ });
    fireEvent.click(within(group).getByRole("button", { name: "No" }));
    fireEvent.click(within(list).getByRole("button", { name: "Save answers" }));
    expect(useStore.getState().tasks.some((t) => t.hazard_id === "gear:crib:slats")).toBe(true);
  });

  it("shows the recall banner on Today for a possible match", () => {
    const s = useStore.getState();
    const id = s.addGear({
      homeId: "demo-home",
      type: "high_chair",
      brand: "Graco",
      secondHand: false,
    });
    s.setGearRecalls(id, new Date().toISOString(), [
      {
        recallId: "1",
        recallNumber: "1",
        title: "Graco high chairs recalled",
        date: "2026-01-01",
        hazard: "Fall hazard",
        url: "https://www.cpsc.gov/Recalls/x",
        modelMentioned: false,
      },
    ]);
    window.location.hash = "#/";
    render(<App />);
    expect(screen.getByText("Possible recall: Graco High chair")).toBeInTheDocument();
  });
});
