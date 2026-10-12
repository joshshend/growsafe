// The kinds of gear GrowSafe knows about: how to search for recalls and where the checklist task lives.
import type { Room } from "../kb/schema";
import type { GearType } from "./types";

export interface GearKind {
  type: GearType;
  terms: string[]; // CPSC ProductName search terms (wildcard match); brand is filtered on the device
  room: Room; // room a checklist task is filed under
  icon: string; // key understood by HazardIcon (unknown keys fall back to a generic icon)
}

export const GEAR_KINDS: GearKind[] = [
  { type: "crib", terms: ["crib"], room: "nursery", icon: "crib" },
  { type: "bassinet", terms: ["bassinet", "cradle"], room: "nursery", icon: "crib" },
  { type: "car_seat", terms: ["car seat"], room: "car", icon: "carseat" },
  { type: "booster", terms: ["booster seat"], room: "car", icon: "carseat" },
  { type: "high_chair", terms: ["high chair"], room: "kitchen", icon: "chair" },
  { type: "stroller", terms: ["stroller"], room: "outdoors", icon: "stroller" },
  { type: "play_yard", terms: ["play yard", "playpen"], room: "living_room", icon: "crib" },
  { type: "bouncer_swing", terms: ["infant swing", "bouncer"], room: "living_room", icon: "swing" },
  { type: "baby_gate", terms: ["gate"], room: "stairs", icon: "stairs" },
  { type: "changing_table", terms: ["changing table"], room: "nursery", icon: "crib" },
];

export const kindOf = (type: GearType): GearKind => GEAR_KINDS.find((k) => k.type === type)!;
