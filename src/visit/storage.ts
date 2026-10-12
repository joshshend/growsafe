// Storage for visit packs. Helper state and the parent's sent list use their own IndexedDB keys,
// separate from the plan ("growsafe:state"), so a helper with no app data never touches it.
// Every call is best-effort; memory copies keep things working when storage is blocked.
import { get, set } from "idb-keyval";
import { create } from "zustand";
import type { SentPack } from "./state";

const SENT_KEY = "growsafe:visit-sent";
export const helperKey = (packId: string) => `growsafe:visit-helper:${packId}`;
const mem = new Map<string, unknown>();

export async function loadKey(key: string): Promise<unknown> {
  try {
    const v = await get(key);
    if (v !== undefined) return v;
  } catch {
    /* fall back to memory */
  }
  return mem.get(key) ?? null;
}

export async function saveKey(key: string, value: unknown): Promise<void> {
  mem.set(key, value);
  try {
    await set(key, value);
  } catch {
    /* storage unavailable */
  }
}

interface SentState {
  sent: SentPack[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (p: SentPack) => void;
  markMerged: (packId: string, at: number) => void;
  remove: (packId: string) => void;
}

const write = (sent: SentPack[]) => void saveKey(SENT_KEY, sent);

export const useSent = create<SentState>()((setState, getState) => ({
  sent: [],
  loaded: false,
  load: async () => {
    const raw = await loadKey(SENT_KEY);
    const stored = Array.isArray(raw) ? (raw as SentPack[]) : [];
    // Keep anything added while loading.
    const ids = new Set(getState().sent.map((p) => p.packId));
    setState({
      sent: [...getState().sent, ...stored.filter((p) => !ids.has(p.packId))],
      loaded: true,
    });
  },
  add: (p) => {
    const sent = [...getState().sent.filter((x) => x.packId !== p.packId), p];
    setState({ sent });
    write(sent);
  },
  markMerged: (packId, at) => {
    const sent = getState().sent.map((p) => (p.packId === packId ? { ...p, mergedAt: at } : p));
    setState({ sent });
    write(sent);
  },
  remove: (packId) => {
    const sent = getState().sent.filter((p) => p.packId !== packId);
    setState({ sent });
    write(sent);
  },
}));
