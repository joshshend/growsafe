import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(screen.getByText("Not checked yet")).toBeInTheDocument();
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

  describe("status lines, Check all and car seat expiry", () => {
    afterEach(() => vi.unstubAllGlobals());

    const addSeat = () =>
      useStore.getState().addGear({
        homeId: "demo-home",
        type: "car_seat",
        brand: "Graco",
        secondHand: false,
      });

    it("shows 'Possible recall: <title>' with a CPSC link, and 'Not checked yet'", () => {
      const s = useStore.getState();
      const a = s.addGear({
        homeId: "demo-home",
        type: "high_chair",
        brand: "Graco",
        secondHand: false,
      });
      s.addGear({ homeId: "demo-home", type: "crib", brand: "Delta", secondHand: false });
      s.setGearRecalls(a, "2026-10-20T12:00:00.000Z", [
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
      render(<App />);
      expect(screen.getByText(/Possible recall: Graco high chairs recalled/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open the CPSC notice" })).toHaveAttribute(
        "href",
        "https://www.cpsc.gov/Recalls/x",
      );
      expect(screen.getByText("Not checked yet")).toBeInTheDocument();
    });

    it("Check all runs every item in turn and a network failure reads 'Couldn't check right now'", async () => {
      const s = useStore.getState();
      s.addGear({ homeId: "demo-home", type: "crib", brand: "Delta", secondHand: false });
      s.addGear({ homeId: "demo-home", type: "stroller", brand: "Graco", secondHand: false });
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes("stroller")) return new Response("[]");
        throw new TypeError("network down");
      });
      vi.stubGlobal("fetch", fetchMock);
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Check all" }));
      await waitFor(() => expect(screen.getByText(/Checked 1 of 2\./)).toBeInTheDocument());
      expect(screen.getByText(/1 couldn't be checked right now/)).toBeInTheDocument();
      expect(screen.getByText("Couldn't check right now")).toBeInTheDocument();
      expect(screen.getByText(/^No recall found \(checked /)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Check all" })).toBeEnabled();
    });

    it("car seats get an Expires date, with the label note and NHTSA links", () => {
      const id = addSeat();
      render(<App />);
      const input = screen.getByLabelText("Expiry date for Graco Car seat");
      expect(
        screen.getByText(/Check the label on your seat: manufacturers set the expiry date\./),
      ).toBeInTheDocument();
      fireEvent.change(input, { target: { value: "2020-01-01" } });
      expect(useStore.getState().gear.find((g) => g.id === id)?.expires).toBe("2020-01-01");
      expect(screen.getByText("Expired")).toBeInTheDocument();
      const link = screen.getByRole("link", { name: /NHTSA: finding the date/ });
      expect(link).toHaveAttribute(
        "href",
        "https://www.nhtsa.gov/car-seats-and-booster-seats/used-car-seat-safety-checklist",
      );
      const future = new Date();
      future.setMonth(future.getMonth() + 14);
      future.setDate(Math.min(future.getDate(), 28));
      const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
      fireEvent.change(input, { target: { value: iso } });
      expect(screen.getByText(/^Expires in 1[34] months$/)).toBeInTheDocument();
    });
  });
});
