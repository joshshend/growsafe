// The doorframe: a graphite jamb with a pencil tick for every height mark, placed in proportion to the real
// height. The newest tick has a pencil-yellow stroke under it (like the logo). The accessible name is passed in;
// the full list of marks is also written out as text below the drawing, so nothing depends on the picture.
import { layoutDoorframe, toUnit, type HeightMark, type HeightUnit } from "../height/height";

const JAMB_X = 64;

// A small, steady wobble per mark so the ticks look hand-drawn but do not jump on re-render.
function wobble(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 5) - 2) * 0.6;
}

export function HeightFrame({
  marks,
  unit,
  label,
  formatValue,
  formatDate,
  newestId,
  animateId,
}: {
  marks: HeightMark[];
  unit: HeightUnit;
  label: string;
  formatValue: (n: number) => string; // number with its unit, already localised
  formatDate: (iso: string) => string;
  newestId: string | null;
  animateId: string | null; // the mark just added: its tick is drawn with the pencil animation
}) {
  const layout = layoutDoorframe(
    marks.map((m) => ({ id: m.id, cm: m.cm })),
    { unit },
  );
  const byId = new Map(marks.map((m) => [m.id, m]));
  const W = 320;
  const top = 12;
  return (
    <svg
      className="hf-svg"
      viewBox={`0 0 ${W} ${layout.height}`}
      role="img"
      aria-label={label}
      focusable="false"
    >
      {/* ruler numbers down the left */}
      {layout.ruler.map((r) => (
        <g key={r.value}>
          <text className="hf-ruler" x={JAMB_X - 14} y={r.y + 4} textAnchor="end">
            {r.value}
          </text>
          <path className="hf-notch" d={`M${JAMB_X - 9} ${r.y}H${JAMB_X - 3}`} />
        </g>
      ))}
      {/* the jamb, slightly off-straight */}
      <path
        className="hf-jamb"
        d={`M${JAMB_X} ${top}C${JAMB_X - 1} ${layout.height * 0.35} ${JAMB_X + 1} ${layout.height * 0.7} ${JAMB_X} ${layout.height - 14}`}
      />
      {layout.floorY !== null && (
        <path className="hf-floor" d={`M${JAMB_X - 30} ${layout.floorY}H${JAMB_X + 56}`} />
      )}
      {layout.ticks.map((tk) => {
        const m = byId.get(tk.id);
        if (!m) return null;
        const w = wobble(m.id);
        const isNew = tk.id === newestId;
        const anim = tk.id === animateId ? "dash26 anim-draw" : undefined;
        const x1 = JAMB_X + 2;
        const x2 = JAMB_X + 34;
        return (
          <g key={tk.id} className={`hf-tick${isNew ? " is-new" : ""}`} data-mark-id={tk.id}>
            {isNew && (
              <path
                className={`hf-yellow ${anim ?? ""}`}
                pathLength={26}
                d={`M${x1 + 3} ${tk.y + 3.5}L${x2 + 2} ${tk.y + 3.5 + w * 0.4}`}
              />
            )}
            <path
              className={`hf-pencil ${anim ?? ""}`}
              pathLength={26}
              d={`M${x1} ${tk.y}L${x2} ${tk.y + w}`}
            />
            {Math.abs(tk.labelY - tk.y) > 3 && (
              <path className="hf-leader" d={`M${x2 + 4} ${tk.y + w}L${x2 + 10} ${tk.labelY}`} />
            )}
            <text className={`hf-label${isNew ? " is-new" : ""}`} x={x2 + 12} y={tk.labelY + 5}>
              <tspan className="hf-val">{formatValue(toUnit(m.cm, unit))}</tspan>
              <tspan className="hf-date" dx="8">
                {formatDate(m.date)}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
