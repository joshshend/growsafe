// "Plan my weekend" (T20): pick the open tasks that remove the most risk within a time and money limit.
// Pure functions only. Task value is the hazard's existing rank score (rankHazards); nothing new is invented.
import type { Child, HazardEntry, Task } from "../kb/schema";
import { rankHazards } from "./rank";

const MINUTE_UNIT = 5;
const DOLLAR_UNIT = 5;
const VALUE_SCALE = 100000; // value dominates; the cost term only breaks ties

export interface WeekendInput {
  tasks: Task[];
  kb: HazardEntry[];
  minutes: number;
  budgetUsd: number | null; // null = no limit
  homeId?: string;
  // Needed to score tasks. Without children every task is worth 1 (still deterministic).
  children?: Child[];
  now?: Date;
}

export interface SupplyItem {
  name: string;
  count: number; // how many chosen tasks need it
}

export interface WeekendPlan {
  chosen: Task[]; // in walk-through order
  skipped: Task[]; // open tasks that did not fit, highest value first
  skippedReason: Record<string, "time" | "cost">; // by task id
  totalMinutes: number;
  totalCostMin: number;
  totalCostMax: number;
  totalCost: number; // sum of per-task midpoints, each rounded to $1
  supplies: SupplyItem[];
  leftoverMinutes: number;
}

export interface Effort {
  minutes: number;
  cost: number; // midpoint of min and max, rounded to $1
  costMin: number;
  costMax: number;
}

export function taskEffort(h: HazardEntry): Effort {
  let minutes = 0;
  let costMin = 0;
  let costMax = 0;
  for (const s of h.fix_steps) {
    if (s.optional) continue; // conditional or alternative steps do not count toward the plan
    minutes += s.minutes;
    costMin += s.cost_usd_min;
    costMax += s.cost_usd_max;
  }
  return { minutes, cost: Math.round((costMin + costMax) / 2), costMin, costMax };
}

interface Item {
  task: Task;
  hazard: HazardEntry;
  value: number;
  effort: Effort;
  mu: number; // minute units (rounded up, so the real total never exceeds the limit)
  cu: number; // dollar units (rounded up)
}

function isOpen(t: Task): boolean {
  return t.status === "todo" || t.status === "doing";
}

export function planWeekend(input: WeekendInput): WeekendPlan {
  const { kb, tasks, homeId, children = [], now = new Date() } = input;
  const minutesLimit = Math.max(0, input.minutes);
  const budget = input.budgetUsd === null ? null : Math.max(0, input.budgetUsd);
  const hazards = new Map(kb.map((h) => [h.id, h]));
  const scoreCache = new Map<string, Map<string, number>>();
  const scoresFor = (child: Child, room: Task["room"]) => {
    const key = `${child.id}|${room}`;
    let m = scoreCache.get(key);
    if (!m) {
      m = new Map();
      try {
        for (const r of rankHazards(kb, child, now, { rooms: [room] })) m.set(r.hazard.id, r.score);
      } catch {
        // a child with a bad birth date contributes nothing
      }
      scoreCache.set(key, m);
    }
    return m;
  };

  const items: Item[] = [];
  for (const task of tasks) {
    if (!isOpen(task)) continue;
    if (homeId !== undefined && task.home_id !== homeId) continue;
    const hazard = hazards.get(task.hazard_id);
    if (!hazard) continue;
    const who =
      task.childIds.length > 0 ? children.filter((c) => task.childIds.includes(c.id)) : children;
    let value = 0;
    for (const c of who) value = Math.max(value, scoresFor(c, task.room).get(hazard.id) ?? 0);
    const effort = taskEffort(hazard);
    items.push({
      task,
      hazard,
      value: Math.max(1, value),
      effort,
      mu: Math.ceil(effort.minutes / MINUTE_UNIT),
      cu: Math.ceil(effort.cost / DOLLAR_UNIT),
    });
  }
  items.sort((a, b) => a.task.id.localeCompare(b.task.id));

  const picked = knapsack(items, minutesLimit, budget);
  const chosenItems = items.filter((_, i) => picked.has(i));
  const rest = items.filter((_, i) => !picked.has(i));

  const totalMinutes = chosenItems.reduce((s, i) => s + i.effort.minutes, 0);
  const totalCost = chosenItems.reduce((s, i) => s + i.effort.cost, 0);
  const leftoverMinutes = Math.max(0, minutesLimit - totalMinutes);

  rest.sort(byValueDesc);
  const skippedReason: Record<string, "time" | "cost"> = {};
  for (const i of rest) {
    let reason: "time" | "cost";
    if (i.effort.minutes > minutesLimit) reason = "time";
    else if (budget !== null && i.effort.cost > budget) reason = "cost";
    else reason = i.effort.minutes > leftoverMinutes ? "time" : "cost";
    skippedReason[i.task.id] = reason;
  }

  return {
    chosen: orderForWalkthrough(chosenItems).map((i) => i.task),
    skipped: rest.map((i) => i.task),
    skippedReason,
    totalMinutes,
    totalCostMin: chosenItems.reduce((s, i) => s + i.effort.costMin, 0),
    totalCostMax: chosenItems.reduce((s, i) => s + i.effort.costMax, 0),
    totalCost,
    supplies: suppliesFor(chosenItems.map((i) => i.hazard)),
    leftoverMinutes,
  };
}

function byValueDesc(a: Item, b: Item): number {
  return b.value - a.value || a.effort.cost - b.effort.cost || a.task.id.localeCompare(b.task.id);
}

// Exact 0/1 knapsack with two limits. Objective: most value, then lowest cost.
function knapsack(items: Item[], minutes: number, budget: number | null): Set<number> {
  const n = items.length;
  const sumM = items.reduce((s, i) => s + i.mu, 0);
  const sumC = items.reduce((s, i) => s + i.cu, 0);
  const M = Math.min(Math.floor(minutes / MINUTE_UNIT), sumM);
  const B = budget === null ? sumC : Math.min(Math.floor(budget / DOLLAR_UNIT), sumC);
  const W = B + 1;
  const plane = (M + 1) * W;
  const dp = new Float64Array((n + 1) * plane);
  for (let i = 1; i <= n; i++) {
    const it = items[i - 1]!;
    const gain = it.value * VALUE_SCALE - it.effort.cost;
    const cur = i * plane;
    const prev = (i - 1) * plane;
    for (let m = 0; m <= M; m++) {
      for (let b = 0; b <= B; b++) {
        let best = dp[prev + m * W + b]!;
        if (it.mu <= m && it.cu <= b) {
          const take = dp[prev + (m - it.mu) * W + (b - it.cu)]! + gain;
          if (take > best) best = take;
        }
        dp[cur + m * W + b] = best;
      }
    }
  }
  const picked = new Set<number>();
  let m = M;
  let b = B;
  for (let i = n; i >= 1; i--) {
    if (dp[i * plane + m * W + b] !== dp[(i - 1) * plane + m * W + b]) {
      picked.add(i - 1);
      m -= items[i - 1]!.mu;
      b -= items[i - 1]!.cu;
    }
  }
  return picked;
}

// Rooms with the most total value first; inside a room, the highest value first.
function orderForWalkthrough(chosen: Item[]): Item[] {
  const groups = new Map<string, Item[]>();
  for (const i of chosen) {
    const key = `${i.task.home_id}|${i.task.room}`;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  }
  const list = [...groups.entries()].map(([key, g]) => ({
    key,
    g: g.sort(byValueDesc),
    total: g.reduce((s, i) => s + i.value, 0),
  }));
  list.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  return list.flatMap((x) => x.g);
}

// Union of tools across the chosen hazards' fix steps, de-duplicated (case-insensitive) and counted per task.
export function suppliesFor(hazards: HazardEntry[]): SupplyItem[] {
  const map = new Map<string, SupplyItem>();
  for (const h of hazards) {
    const seen = new Set<string>();
    for (const s of h.fix_steps)
      for (const raw of s.optional ? [] : s.tools) {
        const name = raw.trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);
        const e = map.get(key);
        if (e) e.count += 1;
        else map.set(key, { name, count: 1 });
      }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
