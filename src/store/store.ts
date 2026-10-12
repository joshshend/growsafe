// App state (Zustand) persisted to IndexedDB. Tasks are rebuilt from the KB whenever the family changes.
import { create } from "zustand";
import { loadKb } from "../kb";
import { PlanSchema, type Child, type Home, type Room, type Task } from "../kb/schema";
import { buildPlan } from "../plan";
import type { Lang } from "../i18n/t";
import { clearSaved, loadSaved, save } from "./persist";
import { GearListSchema, type GearItem, type RecallMatch } from "../recalls/types";
import { keepGearTasks, syncGearTasks } from "../recalls/gear";

export const SCHEMA_VERSION = 1;

export type EmergencyCard = Record<string, string>;
export interface Settings {
  lang: Lang;
  largeText: boolean;
  perceptionConsent: boolean;
}
export interface PersistedState {
  children: Child[];
  homes: Home[];
  tasks: Task[];
  owners: string[];
  emergencyCards: Record<string, EmergencyCard>; // device only, never put in share links
  gear: GearItem[]; // My gear (T23); absent in older saves, which load as []
  settings: Settings;
  schemaVersion: number;
}
interface Actions {
  hydrate: () => Promise<void>;
  addChild: (nickname: string, birthMonth: number, birthYear: number) => string;
  removeChild: (id: string) => void;
  addHome: (name: string, rooms: Room[]) => string;
  removeHome: (id: string) => void;
  addGear: (g: Omit<GearItem, "id">) => string;
  updateGear: (id: string, patch: Partial<Omit<GearItem, "id">>) => void;
  removeGear: (id: string) => void;
  setGearAnswers: (id: string, answers: Record<string, "yes" | "no">) => void;
  setGearRecalls: (id: string, checkedAt: string, matches: RecallMatch[]) => void;
  dismissRecall: (gearId: string, recallId: string) => void;
  addTasks: (tasks: Task[]) => void;
  setStatus: (taskId: string, status: Task["status"]) => void;
  setOwner: (taskId: string, owner: string | undefined) => void;
  setDue: (taskId: string, due: string | undefined) => void;
  setSettings: (patch: Partial<Settings>) => void;
  loadDemo: () => void;
  reset: () => void;
}
export type State = PersistedState & Actions & { hydrated: boolean };

const initial = (): PersistedState => ({
  children: [],
  homes: [],
  tasks: [],
  owners: [],
  emergencyCards: {},
  gear: [],
  settings: { lang: "en", largeText: false, perceptionConsent: false },
  schemaVersion: SCHEMA_VERSION,
});

export function newId(prefix: string): string {
  // Not crypto.randomUUID: that needs a secure context and we may be served over plain http on a LAN.
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Rebuilds tasks for today's date. Tasks added early from the growth preview (T21) are kept as long
// as their home, room, hazard and children still exist.
const rebuild = (
  s: Pick<PersistedState, "children" | "homes" | "tasks"> & { gear?: GearItem[] },
  now = new Date(),
) => {
  const kb = loadKb();
  const built = buildPlan(kb, s.children, s.homes, now, s.tasks);
  const childIds = new Set(s.children.map((c) => c.id));
  const prev = new Map(s.tasks.map((t) => [t.id, t]));
  const merged = built.map((t) => {
    const extra = (prev.get(t.id)?.childIds ?? []).filter(
      (id) => childIds.has(id) && !t.childIds.includes(id),
    );
    return extra.length ? { ...t, childIds: [...t.childIds, ...extra] } : t;
  });
  const have = new Set(built.map((t) => t.id));
  const hazards = new Set(kb.map((h) => h.id));
  const kept = s.tasks.filter(
    (t) =>
      !have.has(t.id) &&
      t.childIds.length > 0 &&
      t.childIds.every((id) => childIds.has(id)) &&
      hazards.has(t.hazard_id) &&
      s.homes.some((h) => h.id === t.home_id && h.rooms.includes(t.room)),
  );
  const gearKept = keepGearTasks(s.tasks, s.gear ?? [], s.homes.map((h) => h.id));
  return [...merged, ...kept, ...gearKept];
};

// Birth month/year that makes a child `months` old today (birthday is assumed to be the 15th).
export function birthFor(months: number, now: Date): { month: number; year: number } {
  const d = new Date(now.getFullYear(), now.getMonth() - months - (now.getDate() < 15 ? 1 : 0), 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export const useStore = create<State>()((set, get) => ({
  ...initial(),
  hydrated: false,

  hydrate: async () => {
    const raw = (await loadSaved()) as Partial<PersistedState> | null;
    if (raw && raw.schemaVersion === SCHEMA_VERSION) {
      const plan = PlanSchema.safeParse({
        children: raw.children,
        homes: raw.homes,
        tasks: raw.tasks,
      });
      if (plan.success) {
        const base = initial();
        const gearParsed = GearListSchema.safeParse(raw.gear ?? []); // saves from before T23 have no gear
        const gear = gearParsed.success ? gearParsed.data : [];
        set({
          ...plan.data,
          gear,
          // A new month may have unlocked new risks, so rebuild on load (keeps progress).
          tasks: rebuild({ ...plan.data, gear }),
          owners: raw.owners ?? [],
          emergencyCards: raw.emergencyCards ?? {},
          settings: { ...base.settings, ...raw.settings },
          hydrated: true,
        });
        return;
      }
    }
    set({ hydrated: true });
  },

  addChild: (nickname, birthMonth, birthYear) => {
    const id = newId("c");
    const children = [
      ...get().children,
      { id, nickname: nickname.trim(), birth_month: birthMonth, birth_year: birthYear },
    ];
    set((s) => ({ children, tasks: rebuild({ ...s, children }) }));
    return id;
  },

  removeChild: (id) => {
    const children = get().children.filter((c) => c.id !== id);
    set((s) => ({ children, tasks: rebuild({ ...s, children }) }));
  },

  addHome: (name, rooms) => {
    const id = newId("h");
    const homes = [...get().homes, { id, name: name.trim(), rooms }];
    set((s) => ({ homes, tasks: rebuild({ ...s, homes }) }));
    return id;
  },

  removeHome: (id) => {
    const homes = get().homes.filter((h) => h.id !== id);
    const gear = get().gear.filter((g) => g.homeId !== id);
    set((s) => ({ homes, gear, tasks: rebuild({ ...s, homes, gear }) }));
  },

  addGear: (g) => {
    const id = newId("g");
    set((s) => ({ gear: [...s.gear, { ...g, id }] }));
    return id;
  },

  updateGear: (id, patch) =>
    set((s) => ({ gear: s.gear.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

  removeGear: (id) =>
    set((s) => {
      const gear = s.gear.filter((g) => g.id !== id);
      return { gear, tasks: syncGearTasks(s.tasks, gear, id) };
    }),

  // Saves checklist answers; each "no" becomes a normal task, a later "yes" removes it.
  setGearAnswers: (id, answers) =>
    set((s) => {
      const gear = s.gear.map((g) => (g.id === id ? { ...g, answers } : g));
      return { gear, tasks: syncGearTasks(s.tasks, gear, id) };
    }),

  setGearRecalls: (id, checkedAt, matches) =>
    set((s) => ({
      gear: s.gear.map((g) =>
        g.id === id ? { ...g, lastChecked: checkedAt, recallMatches: matches } : g,
      ),
    })),

  dismissRecall: (gearId, recallId) =>
    set((s) => ({
      gear: s.gear.map((g) =>
        g.id === gearId ? { ...g, dismissed: [...new Set([...(g.dismissed ?? []), recallId])] } : g,
      ),
    })),

  // Adds tasks early (growth preview). A task that exists gains the new children.
  addTasks: (added) =>
    set((s) => {
      const byId = new Map(s.tasks.map((t) => [t.id, t]));
      for (const a of added) {
        const old = byId.get(a.id);
        byId.set(
          a.id,
          old ? { ...old, childIds: Array.from(new Set([...old.childIds, ...a.childIds])) } : a,
        );
      }
      return { tasks: [...byId.values()] };
    }),

  setStatus: (taskId, status) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) })),

  setOwner: (taskId, owner) =>
    set((s) => {
      const name = owner?.trim() || undefined;
      return {
        owners: name && !s.owners.includes(name) ? [...s.owners, name] : s.owners,
        tasks: s.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const { owner: _old, ...rest } = t;
          void _old;
          return name ? { ...rest, owner: name } : rest;
        }),
      };
    }),

  setDue: (taskId, due) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const { due: _old, ...rest } = t;
        void _old;
        return due ? { ...rest, due } : rest;
      }),
    })),

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  loadDemo: () => {
    const now = new Date();
    const a = birthFor(9, now);
    const b = birthFor(20, now);
    const children: Child[] = [
      { id: "demo-mia", nickname: "Mia", birth_month: a.month, birth_year: a.year },
      { id: "demo-noah", nickname: "Noah", birth_month: b.month, birth_year: b.year },
    ];
    const homes: Home[] = [
      {
        id: "demo-home",
        name: "Our home",
        rooms: ["living_room", "bedroom", "nursery", "kitchen", "bathroom", "stairs"],
      },
    ];
    const tasks = rebuild({ children, homes, tasks: [] }, now);
    const due = new Date(now.getTime() + 7 * 864e5).toISOString().slice(0, 10);
    // Show a little progress so the demo plan does not look untouched.
    const withProgress = tasks.map((t, i): Task => {
      if (i < 2) return { ...t, status: "done" };
      if (i === 2) return { ...t, status: "doing", owner: "Alex", due };
      return t;
    });
    set({
      children,
      homes,
      tasks: withProgress,
      owners: ["Alex", "Sam"],
    });
  },

  reset: () => {
    set({ ...initial() });
    void clearSaved();
  },
}));

const persistedKeys = [
  "children",
  "homes",
  "tasks",
  "owners",
  "emergencyCards",
  "gear",
  "settings",
  "schemaVersion",
] as const;

// Load saved state, then save on every change. Call once at startup.
export async function startPersistence(): Promise<void> {
  await useStore.getState().hydrate();
  useStore.subscribe((s) => {
    if (!s.hydrated) return;
    const out: Record<string, unknown> = {};
    for (const k of persistedKeys) out[k] = s[k];
    void save(out);
  });
}
