// Height marks, kept in their own IndexedDB key (like the emergency cards), so the plan store and the share
// codec never see them. They are never put in a link or an exported plan file.
import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { z } from "zod";
import { useStore, newId } from "../store/store";
import {
  demoMarks,
  isIsoDate,
  MAX_CM,
  MAX_NOTE,
  MIN_CM,
  type HeightMark,
  type HeightUnit,
} from "./height";

export const HEIGHTS_KEY = "growsafe:heights";

const MarkSchema = z.object({
  id: z.string().min(1),
  date: z.string().refine(isIsoDate),
  cm: z.number().min(MIN_CM).max(MAX_CM),
  note: z.string().max(MAX_NOTE).optional(),
});
const SavedSchema = z.object({
  v: z.literal(1),
  unit: z.enum(["cm", "in"]),
  marks: z.record(z.array(MarkSchema)),
});

interface HeightState {
  hydrated: boolean;
  unit: HeightUnit;
  marks: Record<string, HeightMark[]>; // childId -> marks (any order)
  hydrate: () => Promise<void>;
  setUnit: (unit: HeightUnit) => void;
  add: (childId: string, m: Omit<HeightMark, "id">) => HeightMark;
  update: (childId: string, id: string, m: Omit<HeightMark, "id">) => void;
  remove: (childId: string, id: string) => void;
  restore: (childId: string, mark: HeightMark) => void;
  reconcile: () => void;
  reset: () => void;
}

async function write(s: Pick<HeightState, "unit" | "marks">): Promise<void> {
  try {
    await set(HEIGHTS_KEY, { v: 1, unit: s.unit, marks: s.marks });
  } catch {
    /* storage unavailable (private mode, tests): keep working in memory */
  }
}

let hydrating: Promise<void> | null = null;

export const useHeights = create<HeightState>()((setState, getState) => {
  const commit = (patch: Partial<Pick<HeightState, "unit" | "marks">>) => {
    setState(patch);
    void write(getState());
  };
  const mapChild = (childId: string, f: (list: HeightMark[]) => HeightMark[]) =>
    commit({ marks: { ...getState().marks, [childId]: f(getState().marks[childId] ?? []) } });

  return {
    hydrated: false,
    unit: "cm",
    marks: {},

    hydrate: () => {
      if (getState().hydrated) return Promise.resolve();
      hydrating ??= (async () => {
        let saved: z.infer<typeof SavedSchema> | null = null;
        try {
          const parsed = SavedSchema.safeParse(await get(HEIGHTS_KEY));
          saved = parsed.success ? parsed.data : null;
        } catch {
          /* start empty */
        }
        // Anything added while loading wins over what was on disk.
        setState((s) => ({
          hydrated: true,
          unit: saved?.unit ?? s.unit,
          marks: { ...(saved?.marks ?? {}), ...s.marks },
        }));
        getState().reconcile();
      })();
      return hydrating;
    },

    setUnit: (unit) => commit({ unit }),

    add: (childId, m) => {
      const mark: HeightMark = { ...m, id: newId("m") };
      mapChild(childId, (l) => [...l, mark]);
      return mark;
    },
    update: (childId, id, m) =>
      mapChild(childId, (l) => l.map((x) => (x.id === id ? { id, ...m } : x))),
    remove: (childId, id) => mapChild(childId, (l) => l.filter((x) => x.id !== id)),
    restore: (childId, mark) =>
      mapChild(childId, (l) => (l.some((x) => x.id === mark.id) ? l : [...l, mark])),

    // Keeps the marks in step with the children: drops marks of children who were removed or erased, and gives
    // the sample children a few example marks (only once, so deleting them sticks).
    reconcile: () => {
      if (!getState().hydrated || !useStore.getState().hydrated) return;
      const children = useStore.getState().children;
      const ids = new Set(children.map((c) => c.id));
      const next: Record<string, HeightMark[]> = {};
      let changed = false;
      for (const [id, list] of Object.entries(getState().marks)) {
        if (ids.has(id)) next[id] = list;
        else changed = true;
      }
      const now = new Date();
      for (const c of children) {
        if (c.id.startsWith("demo-") && next[c.id] === undefined) {
          const seeded = demoMarks(c.id, now);
          if (seeded.length) {
            next[c.id] = seeded;
            changed = true;
          }
        }
      }
      if (changed) commit({ marks: next });
    },

    reset: () => {
      setState({ unit: "cm", marks: {} });
      void (async () => {
        try {
          await del(HEIGHTS_KEY);
        } catch {
          /* ignore */
        }
      })();
    },
  };
});

// Starts loading once the plan has loaded, and reconciles whenever the list of children changes.
useStore.subscribe((s, prev) => {
  const h = useHeights.getState();
  if (s.hydrated && !h.hydrated) void h.hydrate();
  else if (s.children !== prev.children || s.hydrated !== prev.hydrated) h.reconcile();
});
if (useStore.getState().hydrated) void useHeights.getState().hydrate();
