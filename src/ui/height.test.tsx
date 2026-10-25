import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useHeights } from "../height/store";
import { todayIso } from "../height/height";
import { useUi } from "./ui-state";

const ticks = (c: HTMLElement) => c.querySelectorAll("svg.hf-svg g.hf-tick");

describe("Height tracker", () => {
  beforeEach(async () => {
    window.location.hash = "#/";
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
    useHeights.getState().reset();
    await useHeights.getState().hydrate();
  });

  function openDoorframe() {
    const view = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Explore a sample family" }));
    window.location.hash = "#/height/demo-mia";
    return view;
  }

  it("shows the sample child's four marks, newest highlighted, with the arithmetic and the doctor line", async () => {
    const { container } = openDoorframe();
    expect(await screen.findByRole("heading", { level: 1, name: "Mia's doorframe" })).toBeVisible();
    await waitFor(() => expect(ticks(container)).toHaveLength(4));
    expect(container.querySelectorAll("g.hf-tick.is-new")).toHaveLength(1);
    expect(screen.getByText(/^Grew 1\.5 cm since /)).toBeInTheDocument();
    expect(
      screen.getByText("For your own records. Ask your child's doctor about growth."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/percentile|normal/i)).toBeNull();
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("adding a mark draws a new tick and lists it first", async () => {
    const { container } = openDoorframe();
    await waitFor(() => expect(ticks(container)).toHaveLength(4));
    fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "73.4" } });
    fireEvent.change(screen.getByLabelText("Date measured"), { target: { value: todayIso() } });
    fireEvent.click(screen.getByRole("button", { name: "Draw the mark" }));
    await waitFor(() => expect(ticks(container)).toHaveLength(5));
    // the new tick is drawn with the pencil animation class
    expect(container.querySelectorAll("path.anim-draw").length).toBeGreaterThan(0);
    expect(screen.getByText(/^Grew 1\.4 cm since /)).toBeInTheDocument();
    const first = within(screen.getByRole("list")).getAllByRole("listitem")[0]!;
    expect(first).toHaveTextContent("73.4 cm");
  });

  it("rejects a height out of range and a future date, with words not colour", async () => {
    const { container } = openDoorframe();
    await waitFor(() => expect(ticks(container)).toHaveLength(4));
    fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: "Draw the mark" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a height between 2 and 200 cm.");
    fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Date measured"), { target: { value: "2999-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Draw the mark" }));
    expect(screen.getByRole("alert")).toHaveTextContent("That date is in the future.");
    expect(ticks(container)).toHaveLength(4);
  });

  it("converts when the unit is switched and stores centimetres", async () => {
    const { container } = openDoorframe();
    await waitFor(() => expect(ticks(container)).toHaveLength(4));
    fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "76.2" } });
    fireEvent.click(screen.getByRole("button", { name: "inches" }));
    expect(screen.getByLabelText(/^Height/)).toHaveValue("30");
    fireEvent.click(screen.getByRole("button", { name: "Draw the mark" }));
    await waitFor(() => expect(ticks(container)).toHaveLength(5));
    expect(useHeights.getState().unit).toBe("in");
    const mia = useHeights.getState().marks["demo-mia"]!;
    expect(mia.some((x) => x.cm === 76.2)).toBe(true);
  });

  it("deletes a mark with undo", async () => {
    const { container } = openDoorframe();
    await waitFor(() => expect(ticks(container)).toHaveLength(4));
    fireEvent.click(screen.getAllByRole("button", { name: /^Delete the mark from/ })[0]!);
    await waitFor(() => expect(ticks(container)).toHaveLength(3));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(ticks(container)).toHaveLength(4));
  });

  it("Erase data clears the marks", async () => {
    openDoorframe();
    await waitFor(() => expect(useHeights.getState().marks["demo-mia"]).toHaveLength(4));
    useStore.getState().reset();
    await waitFor(() => expect(useHeights.getState().marks).toEqual({}));
  });
});
