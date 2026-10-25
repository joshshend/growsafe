// "What's in each room?" (onboarding step 4): one room at a time, tap what is there.
// Nothing is assumed: only the taps become tasks. A skipped room stays "Not checked yet".
import { useRef, useState, useEffect } from "react";
import type { Room } from "../kb/schema";
import type { RoomCue } from "../perception";
import { Tick } from "./parts";
import { useT } from "./useT";

const LIMIT = 12;

export interface RoomSetupProps {
  index: number; // 0-based position in the walk-through
  total: number;
  homeName?: string; // shown when more than one place was picked
  room: Room;
  cues: RoomCue[];
  initial: string[]; // taps from an earlier visit to this room (after pressing Back)
  last: boolean;
  onTaps: (cues: string[]) => void; // continue with these taps (zero taps = checked, nothing to fix)
  onSkip: () => void;
  onBack: () => void;
}

export function RoomSetup(p: RoomSetupProps) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(p.initial));
  const [all, setAll] = useState(false);
  useEffect(() => heading.current?.focus(), []);
  const shown = all ? p.cues : p.cues.slice(0, LIMIT);
  const toggle = (cue: string) =>
    setTicked((cur) => {
      const next = new Set(cur);
      if (next.has(cue)) next.delete(cue);
      else next.add(cue);
      return next;
    });
  const n = ticked.size;
  return (
    <div className="flow">
      <div className="flow-s">
        <p className="lbl">{t("onboard.step", { n: 4 })}</p>
        <p className="t2b" aria-live="polite">
          {t("onboard.setup.progress", { n: p.index + 1, total: p.total })}
        </p>
        <h1 ref={heading} tabIndex={-1} className="t-title">
          {p.homeName ? `${t(`room.${p.room}`)} · ${p.homeName}` : t(`room.${p.room}`)}
        </h1>
        <p className="t2 muted">{t("onboard.setup.title")}</p>
        <p className="t1 muted">{t("onboard.setup.hint")}</p>
      </div>
      {p.cues.length === 0 ? (
        <p className="muted">{t("onboard.setup.noCues")}</p>
      ) : (
        <div className="toggle-chips" role="group" aria-label={t("onboard.setup.groupLabel")}>
          {shown.map((c) => (
            <button
              key={c.cue}
              type="button"
              className="toggle-chip"
              aria-pressed={ticked.has(c.cue)}
              onClick={() => toggle(c.cue)}
            >
              <span className="toggle-chip-mark" aria-hidden="true">
                <Tick />
              </span>
              {t(`cue.${c.cue}`)}
            </button>
          ))}
        </div>
      )}
      {p.cues.length > LIMIT && (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setAll(!all)}>
          {t(all ? "scan.showLess" : "scan.showMore")}
        </button>
      )}
      <div className="form-actions">
        {n > 0 ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => p.onTaps([...ticked])}
          >
            {t(p.last ? "onboard.setup.finish" : "onboard.setup.next")}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={() => p.onTaps([])}>
            {t("onboard.setup.nothing")}
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={p.onSkip}>
          {t("onboard.setup.skip")}
        </button>
        <button type="button" className="btn btn-text btn-block" onClick={p.onBack}>
          {t("common.back")}
        </button>
      </div>
      <p className="fine">{t("onboard.setup.later")}</p>
    </div>
  );
}
