// Saves the plan to IndexedDB (idb-keyval). Every call is best-effort: a failure never breaks the app.
import { get, set, del } from "idb-keyval";

const KEY = "growsafe:state";

export async function loadSaved(): Promise<unknown> {
  try {
    return (await get(KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function save(value: unknown): Promise<void> {
  try {
    await set(KEY, value);
  } catch {
    /* storage unavailable (private mode, tests): keep working in memory */
  }
}

export async function clearSaved(): Promise<void> {
  try {
    await del(KEY);
  } catch {
    /* ignore */
  }
}
