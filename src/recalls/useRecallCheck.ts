// Runs a recall check for one gear item and saves a successful result on the item.
import { useCallback } from "react";
import { useStore } from "../store/store";
import { checkRecalls, type RecallOutcome } from "./cpscClient";

export function useRecallCheck(): (gearId: string) => Promise<RecallOutcome | null> {
  return useCallback(async (gearId) => {
    const g = useStore.getState().gear.find((x) => x.id === gearId);
    if (!g) return null;
    const out = await checkRecalls({ brand: g.brand, type: g.type, model: g.model });
    if (out.ok) useStore.getState().setGearRecalls(gearId, out.checkedAt, out.matches);
    return out;
  }, []);
}
