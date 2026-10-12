import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../ui/App";
import { useStore } from "../store/store";
import { useSent } from "./storage";
import { buildVisitPack, encodeReply, encodeVisitPack } from "../share/visit";
import { helperKey, saveKey } from "./storage";

function openHash(h: string) {
  window.location.hash = h;
}

describe("helper view on a fresh browser", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useStore.setState({ hydrated: true });
    useSent.setState({ sent: [], loaded: true });
  });

  it("works with no plan data: tick, name, send back button enables", async () => {
    useStore.getState().loadDemo();
    const s = useStore.getState();
    const pack = buildVisitPack(
      { children: s.children, homes: s.homes, tasks: s.tasks },
      s.homes[0]!.id,
      { from: "Alex", packId: "pack_test_1" },
    );
    // A different browser: nothing in the store.
    useStore.getState().reset();
    useStore.setState({ hydrated: true });
    openHash(`#/visit?d=${encodeVisitPack(pack)}`);
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Alex asked for your help at Our home",
    );
    const send = screen.getByRole("button", { name: "Send back" });
    expect(send).toBeDisabled();
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    expect(send).toBeEnabled();
    fireEvent.click(send);
    expect(await screen.findByRole("alert")).toHaveTextContent("first name");
    fireEvent.change(screen.getByLabelText("Your first name"), { target: { value: "Grandma" } });
    await act(async () => {
      fireEvent.click(send);
    });
    // jsdom has no share or clipboard: the link is shown to copy by hand.
    const box = await screen.findByLabelText("Link");
    expect((box as HTMLInputElement).value).toContain("#/merge?d=");
    expect(screen.getByRole("button", { name: /Easy mode/ })).toBeInTheDocument();
  });

  it("shows a friendly error for a broken link", async () => {
    openHash("#/visit?d=nonsense");
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("damaged or incomplete");
  });

  it("restores ticks from its own storage key", async () => {
    useStore.getState().loadDemo();
    const s = useStore.getState();
    const pack = buildVisitPack(
      { children: s.children, homes: s.homes, tasks: s.tasks },
      s.homes[0]!.id,
      { from: "Alex", packId: "pack_test_2" },
    );
    useStore.getState().reset();
    useStore.setState({ hydrated: true });
    const first = pack.tasks[0]!;
    await saveKey(helperKey(pack.packId), {
      pack,
      by: "Nana",
      tasks: pack.tasks.map((t) =>
        t.id === first.id ? { id: t.id, status: "done", updatedAt: 5 } : { ...t },
      ),
    });
    openHash(`#/visit?d=${encodeVisitPack(pack)}`);
    render(<App />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(screen.getByLabelText("Your first name")).toHaveValue("Nana");
  });
});

describe("parent merge confirm flow", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useStore.getState().loadDemo();
    useStore.setState({ hydrated: true });
    useSent.setState({ sent: [], loaded: true });
  });

  it("summarizes, changes nothing until Confirm, then updates tasks through the store", async () => {
    const s = useStore.getState();
    const open = s.tasks.filter((t) => t.status === "todo").slice(0, 3);
    const reply = encodeReply({
      v: 1,
      packId: "pack_test_3",
      by: "Grandma",
      updates: open.map((t, i) => ({ taskId: t.id, status: "done", at: 1000 + i })),
    });
    openHash(`#/merge?d=${reply}`);
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Grandma finished 3 tasks",
    );
    expect(
      useStore
        .getState()
        .tasks.filter((t) => open.some((o) => o.id === t.id && t.status === "done")),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and update my plan" }));
    expect(screen.getByText("3 tasks updated.")).toBeInTheDocument();
    for (const o of open)
      expect(useStore.getState().tasks.find((t) => t.id === o.id)?.status).toBe("done");
  });

  it("a task the parent changed after sending keeps the parent's version", async () => {
    const s = useStore.getState();
    const [a, b] = s.tasks.filter((t) => t.status === "todo");
    useSent.setState({
      sent: [
        {
          packId: "pack_test_4",
          homeId: s.homes[0]!.id,
          homeName: "Our home",
          helper: "",
          sentAt: 500,
          snapshot: { [a!.id]: "done", [b!.id]: "todo" },
        },
      ],
      loaded: true,
    });
    const reply = encodeReply({
      v: 1,
      packId: "pack_test_4",
      by: "Nana",
      updates: [
        { taskId: a!.id, status: "todo", at: 900 },
        { taskId: b!.id, status: "done", at: 900 },
      ],
    });
    openHash(`#/merge?d=${reply}`);
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Nana finished 1 task",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm and update my plan" }));
    expect(useStore.getState().tasks.find((t) => t.id === a!.id)?.status).toBe("todo");
    expect(useStore.getState().tasks.find((t) => t.id === b!.id)?.status).toBe("done");
    expect(useSent.getState().sent[0]!.mergedAt).toBeTypeOf("number");
  });
});
