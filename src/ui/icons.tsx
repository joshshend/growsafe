// One Phosphor duotone icon per hazard category and per room. Unknown keys fall back to a generic icon.
import type { ComponentType } from "react";
import {
  AppWindow,
  Baby,
  Bathtub,
  BatteryWarning,
  Bed,
  Books,
  Car,
  CarProfile,
  CookingPot,
  Couch,
  Garage,
  Pill,
  Plant,
  Plug,
  PuzzlePiece,
  SprayBottle,
  Stairs,
  SwimmingPool,
  Television,
  Toolbox,
  Tree,
  WarningDiamond,
  type IconProps,
} from "@phosphor-icons/react";

type Icon = ComponentType<IconProps>;

const HAZARD: Record<string, Icon> = {
  bath: Bathtub,
  bathtub: Bathtub,
  battery: BatteryWarning,
  blocks: PuzzlePiece,
  carseat: CarProfile,
  crib: Bed,
  pill: Pill,
  plant: Plant,
  plug: Plug,
  pool: SwimmingPool,
  pot: CookingPot,
  shelf: Books,
  spray: SprayBottle,
  stairs: Stairs,
  tools: Toolbox,
  tv: Television,
  window: AppWindow,
};

const ROOM: Record<string, Icon> = {
  living_room: Couch,
  bedroom: Bed,
  nursery: Baby,
  kitchen: CookingPot,
  bathroom: Bathtub,
  stairs: Stairs,
  outdoors: Tree,
  car: Car,
  garage: Garage,
};

export function HazardIcon({ name, size = 28 }: { name: string; size?: number }) {
  const C = HAZARD[name] ?? WarningDiamond;
  return <C weight="duotone" size={size} aria-hidden="true" />;
}

export function RoomIcon({ room, size = 28 }: { room: string; size?: number }) {
  const C = ROOM[room] ?? Couch;
  return <C weight="duotone" size={size} aria-hidden="true" />;
}
