import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";

describe("photo scan overlay", () => {
  const urls: string[] = [];
  const revoked: string[] = [];
  beforeEach(() => {
    useStore.getState().reset();
    useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false, toast: null });
    useStore.setState({ hydrated: true });
    useStore.getState().loadDemo();
    window.location.hash = "#/scan?home=demo-home&room=living_room";
    URL.createObjectURL = vi.fn(() => {
      const u = `blob:test-${urls.length}`;
      urls.push(u);
      return u;
    });
    URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("sample-room")
          ? new Response("<svg xmlns='http://www.w3.org/2000/svg'/>", {
              headers: { "Content-Type": "image/svg+xml" },
            })
          : new Response("{}", { headers: { "X-Provider": "gemini" } }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("draws numbered boxes on the sample photo, lists them in text, fades unticked ones, revokes the URL", async () => {
    const { unmount, container } = render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Try a sample photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Agree and continue" }));
    expect(await screen.findByText("Sample result")).toBeInTheDocument();
    const img = (await screen.findByRole("img", { name: /spots marked/ })) as HTMLImageElement;
    expect(img.alt).toMatch(/1\. .*; 2\. /);
    fireEvent.load(img);
    expect(container.querySelectorAll(".photo-tag").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll(".photo-hl").length).toBe(
      container.querySelectorAll(".photo-tag").length,
    );
    const chip = screen.getAllByRole("button", { pressed: true })[0]!;
    fireEvent.click(chip);
    expect(container.querySelectorAll(".photo-hl.is-off").length).toBe(1);
    expect(container.querySelectorAll(".photo-hl.is-active").length).toBe(1);
    unmount();
    expect(revoked).toContain(urls[0]);
  });
});
