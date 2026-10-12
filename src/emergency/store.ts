// Emergency cards and the medicine-check answers (T6). Kept in their own IndexedDB keys, separate from
// the plan store, so they can never reach the share codec: encodePlan only ever sees redact() output.
import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import type { Answer } from "./audit";

export const CARDS_KEY = "growsafe:emergency-cards";
export const AUDIT_KEY = "growsafe:medicine-audit";

export interface Contact {
  name: string;
  phone: string;
}
// All free text. No doses and no dose maths: medicines are names only.
export interface Card {
  allergies: string;
  conditions: string;
  medicines: string;
  pediatricianName: string;
  pediatricianPhone: string;
  contacts: Contact[];
}
export const MAX_FIELD = 600;
export const CONTACT_SLOTS = 2;

export function emptyCard(): Card {
  return {
    allergies: "",
    conditions: "",
    medicines: "",
    pediatricianName: "",
    pediatricianPhone: "",
    contacts: Array.from({ length: CONTACT_SLOTS }, () => ({ name: "", phone: "" })),
  };
}

const clip = (v: unknown): string => (typeof v === "string" ? v.slice(0, MAX_FIELD) : "");

// Accepts whatever came out of storage and returns a well-formed card.
export function normalizeCard(raw: unknown): Card {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const base = emptyCard();
  const contacts = Array.isArray(r.contacts) ? r.contacts : [];
  return {
    allergies: clip(r.allergies),
    conditions: clip(r.conditions),
    medicines: clip(r.medicines),
    pediatricianName: clip(r.pediatricianName),
    pediatricianPhone: clip(r.pediatricianPhone),
    contacts: base.contacts.map((_, i) => {
      const c = (contacts[i] && typeof contacts[i] === "object" ? contacts[i] : {}) as Record<
        string,
        unknown
      >;
      return { name: clip(c.name), phone: clip(c.phone) };
    }),
  };
}

export function cardIsEmpty(c: Card): boolean {
  return (
    !c.allergies.trim() &&
    !c.conditions.trim() &&
    !c.medicines.trim() &&
    !c.pediatricianName.trim() &&
    !c.pediatricianPhone.trim() &&
    c.contacts.every((x) => !x.name.trim() && !x.phone.trim())
  );
}

type Audits = Record<string, Record<string, Answer>>; // homeId -> item id -> answer

interface EmergencyState {
  hydrated: boolean;
  cards: Record<string, Card>; // childId -> card
  audits: Audits;
  hydrate: () => Promise<void>;
  saveCard: (childId: string, card: Card) => void;
  clearCard: (childId: string) => void;
  setAnswer: (homeId: string, itemId: string, answer: Answer | null) => void;
  reset: () => void;
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value);
  } catch {
    /* storage unavailable (private mode, tests): keep working in memory */
  }
}

let hydrating: Promise<void> | null = null;

export const useEmergency = create<EmergencyState>()((setState, getState) => ({
  hydrated: false,
  cards: {},
  audits: {},

  hydrate: () => {
    if (getState().hydrated) return Promise.resolve();
    hydrating ??= (async () => {
      let cards: Record<string, Card> = {};
      let audits: Audits = {};
      try {
        const rawCards = (await get(CARDS_KEY)) as Record<string, unknown> | undefined;
        if (rawCards && typeof rawCards === "object")
          cards = Object.fromEntries(
            Object.entries(rawCards).map(([k, v]) => [k, normalizeCard(v)]),
          );
        const rawAudit = (await get(AUDIT_KEY)) as Audits | undefined;
        if (rawAudit && typeof rawAudit === "object") audits = rawAudit;
      } catch {
        /* start empty */
      }
      // Anything saved while loading wins over what was on disk.
      setState((s) => ({
        hydrated: true,
        cards: { ...cards, ...s.cards },
        audits: { ...audits, ...s.audits },
      }));
    })();
    return hydrating;
  },

  saveCard: (childId, card) => {
    const cards = { ...getState().cards, [childId]: normalizeCard(card) };
    setState({ cards });
    void write(CARDS_KEY, cards);
  },

  clearCard: (childId) => {
    const { [childId]: _gone, ...cards } = getState().cards;
    void _gone;
    setState({ cards });
    void write(CARDS_KEY, cards);
  },

  setAnswer: (homeId, itemId, answer) => {
    const home = { ...(getState().audits[homeId] ?? {}) };
    if (answer) home[itemId] = answer;
    else delete home[itemId];
    const audits = { ...getState().audits, [homeId]: home };
    setState({ audits });
    void write(AUDIT_KEY, audits);
  },

  reset: () => {
    hydrating = null;
    setState({ hydrated: false, cards: {}, audits: {} });
    void (async () => {
      try {
        await del(CARDS_KEY);
        await del(AUDIT_KEY);
      } catch {
        /* ignore */
      }
    })();
  },
}));
