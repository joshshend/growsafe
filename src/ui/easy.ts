// Easy mode: UI-only preference (localStorage + small store), applied as data-easy on <html>.
// Kept outside src/store so the saved plan format never changes.
import { useEffect } from "react";
import { create } from "zustand";

const KEY = "growsafe:easy";

export function readEasy(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function applyEasy(on: boolean): void {
  const root = document.documentElement;
  if (on) root.setAttribute("data-easy", "on");
  else root.removeAttribute("data-easy");
}

export function saveEasy(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "on");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  applyEasy(on);
}

interface EasyState {
  easy: boolean;
  setEasy: (on: boolean) => void;
}
export const useEasyStore = create<EasyState>()((set) => ({
  easy: readEasy(),
  setEasy: (on) => {
    saveEasy(on);
    set({ easy: on });
  },
}));

export function useEasy(): boolean {
  return useEasyStore((s) => s.easy);
}

// Call once in Layout: keeps the attribute in sync with the store.
export function useApplyEasy(): void {
  const easy = useEasy();
  useEffect(() => applyEasy(easy), [easy]);
}
