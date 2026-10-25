// The Home map drawing: a two-storey house in cutaway, six rooms on a 3 x 2 grid, with optional yard, car and
// garage under it. Same style as the room drawings (graphite line, one flat fill printed off-register, the shared
// #wob hand wobble), but each room is also a link, so the state of the room is drawn into it:
//   hatch = not checked, pencil yellow (stronger = more and more serious fixes) = fixes open, graphite tick = done.
// Text and badges stay crisp (outside the wobble filter) so they read at 320px.
import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Room } from "../../kb/schema";
import type { RoomState } from "../homeMapState";

export interface CutawayRoom {
  state: RoomState;
  href: string;
  ariaLabel: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const W = 320;
const FLOOR_Y = 218; // ground line
const HOUSE_ROOMS = ["bedroom", "nursery", "bathroom", "living_room", "stairs", "kitchen"] as const;
const EXTRAS = ["outdoors", "car", "garage"] as const;
type HouseRoom = (typeof HOUSE_ROOMS)[number];
type Extra = (typeof EXTRAS)[number];

// 3 columns x 2 floors; every box is 84 tall.
const BOXES: Record<HouseRoom, Box> = {
  bedroom: { x: 10, y: 50, w: 95, h: 84 },
  nursery: { x: 105, y: 50, w: 110, h: 84 },
  bathroom: { x: 215, y: 50, w: 95, h: 84 },
  living_room: { x: 10, y: 134, w: 95, h: 84 },
  stairs: { x: 105, y: 134, w: 110, h: 84 },
  kitchen: { x: 215, y: 134, w: 95, h: 84 },
};

// Furniture, drawn in each room's own coordinates (0,0 is the room's top-left; the floor is at y = 76).
const ART: Record<HouseRoom, ReactNode> = {
  bedroom: (
    <>
      <rect x="8" y="42" width="6" height="34" rx="2" />
      <rect x="14" y="58" width="50" height="18" rx="2" />
      <rect x="18" y="50" width="16" height="8" rx="4" />
      <rect x="72" y="60" width="16" height="16" rx="1.5" />
      <path d="M76 42h8l3 10H73z" />
      <path d="M80 52v8" className="thin" />
    </>
  ),
  nursery: (
    <>
      <rect x="10" y="48" width="52" height="28" rx="2" />
      <path d="M21 48v28M32 48v28M43 48v28M53 48v28" className="thin" />
      <path d="M36 26v12M24 38h24" className="thin" />
      <circle cx="24" cy="43" r="3.5" />
      <circle cx="48" cy="43" r="3.5" />
      <rect x="74" y="56" width="26" height="20" rx="1.5" />
      <path d="M74 66h26M85 61h4M85 71h4" className="thin" />
    </>
  ),
  bathroom: (
    <>
      <path d="M8 56H62V66q0 10-10 10H18q-10 0-10-10z" />
      <path d="M14 56v-9h8" className="thin" />
      <rect x="70" y="62" width="14" height="14" rx="1.5" />
      <path d="M74 62v-7h6v7" className="thin" />
    </>
  ),
  living_room: (
    <>
      <rect x="10" y="64" width="42" height="12" rx="1.5" />
      <rect x="14" y="40" width="34" height="24" rx="2" />
      <rect x="58" y="56" width="30" height="20" rx="5" />
      <path d="M31 40l-5-7M31 40l5-7" className="thin" />
    </>
  ),
  stairs: (
    <>
      <path d="M12 76V66H30V56H48V46H66V36H84V76z" />
      <path d="M12 62L84 22" className="thin" />
      <path d="M96 76V28" className="thin" />
    </>
  ),
  kitchen: (
    <>
      <rect x="8" y="58" width="50" height="18" rx="1.5" />
      <rect x="8" y="30" width="40" height="14" rx="1.5" />
      <rect x="62" y="34" width="22" height="42" rx="2" />
      <path d="M62 52h22M67 40v6M67 58v6M18 58v18" className="thin" />
    </>
  ),
};

// Yard, car and garage sit under the house, in boxes 50 tall; art is centred in the box.
const EXTRA_ART: Record<Extra, { w: number; node: ReactNode }> = {
  outdoors: {
    w: 56,
    node: (
      <>
        <path d="M14 42V30" />
        <circle cx="14" cy="22" r="9" />
        <path d="M28 42v-8h24v8M28 38h24M34 34v8M40 34v8M46 34v8" className="thin" />
      </>
    ),
  },
  car: {
    w: 60,
    node: (
      <>
        <path d="M4 38V30l8-2 6-8h20l8 8 10 2v8z" />
        <path d="M20 22v6M38 22v6" className="thin" />
        <circle cx="16" cy="40" r="4.5" />
        <circle cx="48" cy="40" r="4.5" />
      </>
    ),
  },
  garage: {
    w: 56,
    node: (
      <>
        <path d="M4 42V22L28 10l24 12v20z" />
        <rect x="14" y="26" width="28" height="16" />
        <path d="M14 31h28M14 36h28" className="thin" />
      </>
    ),
  },
};

function Region({
  box,
  room,
  art,
  artDx = 0,
  hatchId,
  dim,
  name,
}: {
  box: Box;
  room?: CutawayRoom;
  art: ReactNode;
  artDx?: number;
  hatchId: string;
  dim?: boolean;
  name: string;
}) {
  const state = room?.state;
  const { x, y, w, h } = box;
  const labelMax = Math.max(24, w - 6 - (state && state.kind !== "unchecked" ? 28 : 8));
  const guess = name.length * 5.6;
  const body = (
    <>
      <rect className="hm-base" x={x} y={y} width={w} height={h} />
      {state?.kind === "open" && (
        <rect
          className={`hm-tint hm-i${state.intensity}`}
          x={x + 3}
          y={y + 3}
          width={w - 3}
          height={h - 3}
        />
      )}
      {state?.kind === "done" && (
        <rect className="hm-tint hm-done" x={x + 3} y={y + 3} width={w - 3} height={h - 3} />
      )}
      {state?.kind === "unchecked" && (
        <rect className="hm-hatch" x={x} y={y} width={w} height={h} fill={`url(#${hatchId})`} />
      )}
      <g className="hm-ln" style={{ filter: "url(#wob)" }}>
        <rect x={x} y={y} width={w} height={h} />
        <g transform={`translate(${x + artDx} ${y})`}>{art}</g>
      </g>
      <text
        className="hm-name"
        x={x + 6}
        y={y + 15}
        {...(guess > labelMax ? { textLength: labelMax, lengthAdjust: "spacingAndGlyphs" } : {})}
      >
        {name}
      </text>
      {state?.kind === "open" && (
        <g className="hm-badge hm-badge-open">
          <circle cx={x + w - 14} cy={y + 14} r="9" />
          <text x={x + w - 14} y={y + 18.2} textAnchor="middle">
            {state.open}
          </text>
        </g>
      )}
      {state?.kind === "done" && (
        <g className="hm-badge hm-badge-done">
          <circle cx={x + w - 14} cy={y + 14} r="9" />
          <path d={`M${x + w - 18.5} ${y + 14.2}l3.2 3.4 6-7`} />
        </g>
      )}
      <rect className="hm-focus" x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} />
    </>
  );
  if (!room || dim) {
    return (
      <g className="hm-room hm-missing" aria-hidden="true">
        {body}
      </g>
    );
  }
  return (
    <Link to={room.href} className={`hm-room hm-${state?.kind}`} aria-label={room.ariaLabel}>
      {body}
    </Link>
  );
}

export function HomeCutaway({
  rooms,
  names,
  label,
}: {
  rooms: Partial<Record<Room, CutawayRoom>>;
  names: Record<string, string>; // translated room names (also for rooms this home does not have)
  label: string;
}) {
  const hatchId = `hm-hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const extras = EXTRAS.filter((e) => rooms[e]);
  const H = extras.length > 0 ? 290 : 226;
  const gap = 8;
  const cell = (300 - gap * (extras.length - 1)) / Math.max(1, extras.length);
  return (
    <svg className="hm" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label}>
      <defs>
        <pattern
          id={hatchId}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path d="M0 0V7" className="hm-hatch-line" />
        </pattern>
      </defs>
      {/* house: offset fill, roof, chimney */}
      <g className="fl" transform="translate(5 4)">
        <path d="M2 50L160 8L318 50z" />
        <rect x="236" y="14" width="14" height="30" />
      </g>
      <g className="hm-ln" style={{ filter: "url(#wob)" }}>
        <path d="M2 50L160 8L318 50" />
        <path d="M236 22V14h14v28" />
        <path d={`M0 ${FLOOR_Y}H${W}`} />
        <path
          d={`M6 ${FLOOR_Y + 6}h14M40 ${FLOOR_Y + 6}h22M250 ${FLOOR_Y + 6}h18M290 ${FLOOR_Y + 6}h14`}
          className="thin"
        />
      </g>
      {HOUSE_ROOMS.map((r) => (
        <Region
          key={r}
          box={BOXES[r]}
          room={rooms[r]}
          dim={!rooms[r]}
          name={names[r] ?? r}
          art={ART[r]}
          hatchId={hatchId}
        />
      ))}
      {extras.map((e, i) => {
        const box: Box = { x: 10 + i * (cell + gap), y: FLOOR_Y + 10, w: cell, h: 54 };
        const art = EXTRA_ART[e];
        return (
          <Region
            key={e}
            box={box}
            room={rooms[e]}
            name={names[e] ?? e}
            art={<g transform="translate(0 8)">{art.node}</g>}
            artDx={(cell - art.w) / 2}
            hatchId={hatchId}
          />
        );
      })}
    </svg>
  );
}
