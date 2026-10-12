import { describe, expect, it } from "vitest";
import { deflateSync, strToU8 } from "fflate";
import type { Plan } from "../kb/schema";
import {
  buildReply,
  buildVisitPack,
  decodeReply,
  decodeVisitPack,
  encodeReply,
  encodeVisitPack,
  mergeReply,
  replyUrl,
  visitPackUrl,
  type Reply,
} from "./visit";

const toB64u = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const NOW = new Date(2026, 9, 20);

const plan = {
  children: [
    {
      id: "c1",
      nickname: "Mia",
      birth_month: 3,
      birth_year: 2025,
      fullName: "Mia Quillfeather Zorbonski",
      birthdate: "2025-03-07",
    },
  ],
  homes: [
    {
      id: "h1",
      name: "Grandma's house",
      rooms: ["kitchen", "nursery"],
      address: "4417 Marigold Lane",
    },
  ],
  tasks: [
    {
      id: "t1",
      hazard_id: "tv-furniture-tip-over",
      home_id: "h1",
      room: "nursery",
      childIds: ["c1"],
      status: "todo",
      notes: "call landlord",
      photo: "data:image/png;base64,AAAA",
    },
    {
      id: "t2",
      hazard_id: "stairs-and-gates",
      home_id: "h1",
      room: "kitchen",
      childIds: ["c1"],
      status: "done",
    },
    {
      id: "t3",
      hazard_id: "medicine-storage",
      home_id: "h2",
      room: "kitchen",
      childIds: ["c1"],
      status: "todo",
    },
  ],
  emergencyCards: { c1: { allergies: "penicillin", pediatrician: "Dr. Xylophone 555-0199" } },
} as unknown as Plan;

const pack = buildVisitPack(plan, "h1", {
  from: "Josh",
  packId: "pack-abc12345",
  now: NOW,
  stamps: { t1: 100, t2: 100 },
});
const reply = (updates: Reply["updates"]): Reply => ({
  v: 1,
  packId: pack.packId,
  by: "Grandma",
  updates,
});

describe("visit pack", () => {
  it("builds one home only, with an age band, and round-trips via data and link", () => {
    expect(pack.tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(pack.ageBand).toBe("12-24m");
    expect(decodeVisitPack(encodeVisitPack(pack))).toEqual(pack);
    expect(decodeVisitPack(visitPackUrl("https://g.example/", pack))).toEqual(pack);
    expect(visitPackUrl("https://g.example/", pack)).toContain("/#/visit?d=");
  });
  it("carries no private data in the pack or its link", () => {
    const raw = JSON.stringify(pack) + JSON.stringify(decodeVisitPack(encodeVisitPack(pack)));
    for (const s of [
      "Quillfeather",
      "2025-03-07",
      "Marigold",
      "penicillin",
      "Xylophone",
      "landlord",
      "data:image",
      "birth_",
      "emergency",
    ]) {
      expect(raw).not.toContain(s);
    }
  });
  it("rejects full names, bad ids, unknown keys, bad version, garbage", () => {
    expect(() => encodeVisitPack({ ...pack, from: "Josh Shen" })).toThrow();
    expect(() => encodeVisitPack({ ...pack, packId: "x" })).toThrow();
    const mk = (o: object) => toB64u(deflateSync(strToU8(JSON.stringify(o))));
    expect(() => decodeVisitPack(mk({ ...pack, v: 2 }))).toThrow(/version/i);
    expect(() => decodeVisitPack(mk({ ...pack, emergency: {} }))).toThrow();
    expect(() =>
      decodeVisitPack(mk({ ...pack, tasks: [{ ...pack.tasks[0], status: "x" }] })),
    ).toThrow();
    const enc = encodeVisitPack(pack);
    const flipped = enc.slice(0, 10) + (enc[10] === "A" ? "B" : "A") + enc.slice(11);
    for (const bad of ["", "not base64 !!", "AAAA", enc.slice(0, 20), flipped]) {
      expect(() => decodeVisitPack(bad)).toThrow();
    }
  });
  it("enforces the size cap on encode and decode", () => {
    const big = {
      ...pack,
      tasks: Array.from({ length: 200 }, (_, i) => ({
        ...pack.tasks[0],
        id: `task-${i}-${Math.random().toString(36).slice(2)}`,
        hazardId: Array.from({ length: 80 }, () => Math.random().toString(36)[2]).join(""),
      })),
    };
    expect(() => encodeVisitPack(big)).toThrow(/too large/i);
    expect(() => decodeVisitPack("A".repeat(9000))).toThrow(/too large/i);
  });
});

describe("reply", () => {
  it("round-trips and carries only ids, statuses, times and a first name", () => {
    const r = reply([{ taskId: "t1", status: "done", at: 200 }]);
    expect(decodeReply(encodeReply(r))).toEqual(r);
    expect(decodeReply(replyUrl("https://g.example", r))).toEqual(r);
    expect(replyUrl("https://g.example", r)).toContain("/#/merge?d=");
    expect(() => encodeReply({ ...r, by: "Grand Ma" })).toThrow();
    expect(() => encodeReply({ ...r, extra: 1 } as unknown as Reply)).toThrow();
    expect(() => decodeReply(encodeVisitPack(pack))).toThrow();
  });
  it("buildReply lists only changed tasks", () => {
    const r = buildReply(
      pack,
      [
        { id: "t1", status: "done", updatedAt: 300 },
        { id: "t2", status: "done", updatedAt: 100 },
        { id: "nope", status: "done", updatedAt: 300 },
      ],
      "Grandma",
    );
    expect(r.updates).toEqual([{ taskId: "t1", status: "done", at: 300 }]);
  });
});

describe("mergeReply", () => {
  const local = [
    { id: "t1", status: "todo" as const, updatedAt: 100 },
    { id: "t2", status: "done" as const, updatedAt: 100 },
    { id: "t4", status: "doing" as const },
  ];
  it("applies newer updates, ignores unknown ids, reports summary", () => {
    const { tasks, summary } = mergeReply(
      local,
      reply([
        { taskId: "t1", status: "done", at: 200 },
        { taskId: "zzz", status: "done", at: 200 },
        { taskId: "t4", status: "done", at: 5 },
      ]),
    );
    expect(tasks.find((t) => t.id === "t1")).toMatchObject({ status: "done", updatedAt: 200 });
    expect(tasks.find((t) => t.id === "t4")?.status).toBe("done");
    expect(summary).toEqual({ applied: 2, ignored: 1, by: "Grandma" });
    expect(local[0].status).toBe("todo"); // input not mutated
  });
  it("never downgrades done to todo unless newer; equal timestamps lose", () => {
    const stale = mergeReply(
      local,
      reply([
        { taskId: "t2", status: "todo", at: 50 },
        { taskId: "t2", status: "todo", at: 100 },
      ]),
    );
    expect(stale.tasks[1].status).toBe("done");
    expect(stale.summary.applied).toBe(0);
    const newer = mergeReply(local, reply([{ taskId: "t2", status: "todo", at: 101 }]));
    expect(newer.tasks[1].status).toBe("todo");
  });
  it("is order independent within a reply and idempotent", () => {
    const ups = [
      { taskId: "t1", status: "doing" as const, at: 150 },
      { taskId: "t1", status: "done" as const, at: 250 },
    ];
    const a = mergeReply(local, reply(ups));
    const b = mergeReply(local, reply([...ups].reverse()));
    expect(a.tasks).toEqual(b.tasks);
    expect(a.tasks[0].status).toBe("done");
    const again = mergeReply(a.tasks, reply(ups));
    expect(again.tasks).toEqual(a.tasks);
    expect(again.summary.applied).toBe(0);
  });
  it("rejects a tampered reply", () => {
    expect(() =>
      mergeReply(local, {
        ...reply([]),
        updates: [{ taskId: "t1", status: "bogus", at: 1 }],
      } as unknown as Reply),
    ).toThrow();
  });
});
