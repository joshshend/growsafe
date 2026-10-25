// The six room drawings. Canvas 160 x 120, floor line at y = 104. Geometry copied from docs/design/Illustration.dc.html.
import { Scene, type SceneProps } from "./Scene";

export function LivingRoom({
  label = "Living room: a TV on a console with a wall strap, and an armchair",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <rect x="30" y="34" width="68" height="38" rx="3" />
          <rect x="22" y="72" width="84" height="26" rx="2" />
          <rect x="116" y="62" width="34" height="36" rx="7" />
        </>
      }
      lines={
        <>
          <path d="M8 104H152M32 98v6M96 98v6M64 72v26M116 82H150M98 42L116 26" />
          <circle cx="117" cy="25" r="2.6" />
        </>
      }
    />
  );
}

export function Bedroom({
  label = "Bedroom: a bed with a headboard and a bedside table with a lamp",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <rect x="14" y="44" width="10" height="60" rx="2" />
          <rect x="24" y="66" width="86" height="32" rx="3" />
          <rect x="30" y="54" width="28" height="12" rx="6" />
          <rect x="120" y="70" width="28" height="28" rx="2" />
          <path d="M127 46h14l4 14h-22z" />
        </>
      }
      lines={
        <path d="M8 104H152M64 66v32M134 60v10M120 84h28M131 91h4M30 98v6M104 98v6M126 98v6M142 98v6" />
      }
    />
  );
}

export function Nursery({
  label = "Nursery: a crib with a mobile and a dresser",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <rect x="26" y="50" width="80" height="48" rx="3" />
          <rect x="116" y="64" width="34" height="34" rx="2" />
          <circle cx="50" cy="32" r="5" />
          <circle cx="66" cy="37" r="5" />
          <circle cx="82" cy="32" r="5" />
        </>
      }
      lines={
        <path d="M10 104H150M40 50v48M54 50v48M68 50v48M82 50v48M96 50v48M66 6V22M46 22H86M50 22v5M66 22v10M82 22v5M116 81H150M129 72h6M129 90h6M32 98v6M100 98v6" />
      }
    />
  );
}

export function Kitchen({
  label = "Kitchen: cabinets, a pot on the counter and a fridge",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <rect x="14" y="66" width="100" height="32" rx="2" />
          <rect x="14" y="22" width="60" height="30" rx="2" />
          <rect x="84" y="50" width="22" height="16" rx="2" />
          <rect x="122" y="30" width="30" height="68" rx="3" />
        </>
      }
      lines={
        <>
          <path d="M8 104H152M64 66v32M44 22v30M106 56h8M95 50v-4M122 58h30M128 38v10M128 66v12" />
          <circle cx="58" cy="82" r="1.6" />
          <circle cx="70" cy="82" r="1.6" />
        </>
      }
    />
  );
}

export function Bathroom({
  label = "Bathroom: a bathtub with a faucet and a stool with a towel",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <path d="M16 62H120V80q0 18-18 18H34q-18 0-18-18z" />
          <rect x="128" y="76" width="22" height="22" rx="2" />
        </>
      }
      lines={
        <path d="M8 104H152M30 98v6M106 98v6M24 62V44q0-6 6-6h8v6M26 72q5-4 10 0t10 0t10 0t10 0t10 0t10 0M128 84h22M132 76v-10h14v10" />
      }
    />
  );
}

export function Stairs({
  label = "Stairs: a staircase with a baby gate at the top",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <path d="M14 104V88H44V72H74V56H104V40H134V104z" />
          <rect x="110" y="14" width="26" height="26" rx="2" />
        </>
      }
      lines={
        <>
          <path d="M8 104H152M118 14v26M127 14v26" />
          <circle cx="131" cy="27" r="1.8" />
        </>
      }
    />
  );
}

export const ROOM_ILLUSTRATIONS = {
  living_room: LivingRoom,
  bedroom: Bedroom,
  nursery: Nursery,
  kitchen: Kitchen,
  bathroom: Bathroom,
  stairs: Stairs,
} as const;

// Rooms with no drawing (outdoors, car, garage) return null: the design only defines the six above.
export function RoomIllustration({ room, ...rest }: SceneProps & { room: string }) {
  const Comp = (ROOM_ILLUSTRATIONS as Record<string, (p: SceneProps) => JSX.Element>)[room];
  return Comp ? <Comp {...rest} /> : null;
}
