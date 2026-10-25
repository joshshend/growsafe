// UI-only state: which child is shown, which task sheet is open, and the undo toast.
// Lives outside src/store so the saved plan format never changes.
import { create } from "zustand";
import { useStore } from "../store/store";
import type { Child } from "../kb/schema";

export interface Toast {
  message: string;
  undo?: () => void;
}
interface UiState {
  activeChildId: string | null;
  openTaskId: string | null;
  switcherOpen: boolean;
  toast: Toast | null;
  demoBannerDismissed: boolean;
  dismissDemoBanner: () => void;
  setActiveChild: (id: string) => void;
  openTask: (id: string | null) => void;
  setSwitcher: (open: boolean) => void;
  showToast: (toast: Toast | null) => void;
}

export const useUi = create<UiState>()((set) => ({
  activeChildId: null,
  openTaskId: null,
  switcherOpen: false,
  toast: null,
  demoBannerDismissed: false,
  dismissDemoBanner: () => set({ demoBannerDismissed: true }),
  setActiveChild: (id) => set({ activeChildId: id }),
  openTask: (id) => set({ openTaskId: id }),
  setSwitcher: (open) => set({ switcherOpen: open }),
  showToast: (toast) => set({ toast }),
}));

// The child the screens are about: the chosen one, or the first child.
export function useActiveChild(): Child | null {
  const children = useStore((s) => s.children);
  const id = useUi((s) => s.activeChildId);
  return children.find((c) => c.id === id) ?? children[0] ?? null;
}
