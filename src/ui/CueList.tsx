// The "tap what you see" list shared by onboarding (RoomSetup) and the room check (Scan).
// Full-width, left-aligned rows with the drawn-tick box, hairlines between rows, grouped by hazard.
import type { ReactNode } from "react";
import type { RoomCue } from "../perception";
import { Tick } from "./parts";
import { useT } from "./useT";
import "./cuelist.css";

export function CueList({
  cues,
  ticked,
  onToggle,
  groupName,
  label,
}: {
  cues: RoomCue[];
  ticked: ReadonlySet<string>;
  onToggle: (cue: string) => void;
  groupName?: (hazardId: string) => string; // when given, rows are grouped under hazard names
  label: string;
}) {
  const t = useT();
  const groups: { id: string; items: RoomCue[] }[] = [];
  if (groupName) {
    for (const c of cues) {
      const g = groups.find((x) => x.id === c.hazardId);
      if (g) g.items.push(c);
      else groups.push({ id: c.hazardId, items: [c] });
    }
  } else groups.push({ id: "", items: cues });
  return (
    <div className="cue-groups" role="group" aria-label={label}>
      {groups.map((g) => (
        <section key={g.id || "all"} className="cue-group">
          {groupName && <h2 className="lbl cue-group-name">{groupName(g.id)}</h2>}
          <ul className="cue-list">
            {g.items.map((c) => {
              const on = ticked.has(c.cue);
              return (
                <li key={c.cue} className={`cue-row${on ? " is-on" : ""}`}>
                  <label className="cue-label">
                    <input
                      type="checkbox"
                      className="cue-input"
                      checked={on}
                      onChange={() => onToggle(c.cue)}
                    />
                    <span className="cue-box" aria-hidden="true">
                      <Tick className="cue-tick" />
                    </span>
                    <span className="cue-text">{t(`cue.${c.cue}`)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Primary action pinned to the bottom of the screen. It stays in the flow (sticky), so on the
// last scroll it simply sits at the end and nothing is ever hidden behind it.
export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}
