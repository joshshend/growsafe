import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { ROOMS, type Room } from "../kb/schema";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";
import { useT } from "./useT";

type HomeKey = "mine" | "grandparents" | "sitter";
const HOME_KEYS: HomeKey[] = ["mine", "grandparents", "sitter"];

function defaultRooms(months: number): Room[] {
  return ["living_room", "kitchen", months < 24 ? "nursery" : "bedroom", "bathroom", "stairs"];
}

export function Onboarding() {
  const t = useT();
  const nav = useNavigate();
  const addChild = useStore((s) => s.addChild);
  const addHome = useStore((s) => s.addHome);
  const setActiveChild = useUi((s) => s.setActiveChild);
  const now = new Date();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<HomeKey[]>(["mine"]);
  const [rooms, setRooms] = useState<Record<HomeKey, Room[]> | null>(null);
  const [editing, setEditing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    if (step > 1) heading.current?.focus();
  }, [step]);

  function next1(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("child.errorName"));
    if (!month || !year) return setError(t("child.errorBirth"));
    if (
      Number(year) > now.getFullYear() ||
      (Number(year) === now.getFullYear() && Number(month) > now.getMonth() + 1)
    )
      return setError(t("child.errorFuture"));
    setError("");
    setStep(2);
  }

  function toggleHome(k: HomeKey) {
    setError("");
    setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  function next2() {
    if (picked.length === 0) return setError(t("onboard.errorHome"));
    const months = (now.getFullYear() - Number(year)) * 12 + (now.getMonth() + 1 - Number(month));
    const base = defaultRooms(months);
    setRooms((cur) => {
      const out = { mine: base, grandparents: base, sitter: base, ...(cur ?? {}) };
      return out as Record<HomeKey, Room[]>;
    });
    setError("");
    setStep(3);
  }

  function toggleRoom(k: HomeKey, r: Room) {
    setRooms((cur) => {
      if (!cur) return cur;
      const has = cur[k].includes(r);
      return { ...cur, [k]: has ? cur[k].filter((x) => x !== r) : [...cur[k], r] };
    });
  }

  function finish() {
    if (!rooms) return;
    if (picked.some((k) => rooms[k].length === 0)) return setError(t("home.errorRooms"));
    const childId = addChild(name, Number(month), Number(year));
    for (const k of picked) {
      addHome(
        t(`onboard.home.${k}`),
        ROOMS.filter((r) => rooms[k].includes(r)),
      );
    }
    setActiveChild(childId);
    nav("/", { replace: true });
  }

  const back = (
    <button
      type="button"
      className="btn btn-text btn-block"
      onClick={() => {
        setError("");
        if (step === 1) nav("/");
        else setStep(step - 1);
      }}
    >
      {t("common.back")}
    </button>
  );

  if (step === 1) {
    return (
      <form className="flow" onSubmit={next1} noValidate>
        <div className="flow-s">
          <p className="step-label">{t("onboard.step", { n: 1 })}</p>
          <h1 ref={heading} tabIndex={-1} className="t-title">
            {t("onboard.who")}
          </h1>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="nick">
            {t("child.nickname")}
          </label>
          <input
            id="nick"
            className="input"
            value={name}
            maxLength={40}
            autoComplete="off"
            aria-describedby="nick-hint"
            onChange={(e) => setName(e.target.value)}
          />
          <p id="nick-hint" className="field-hint">
            {t("child.nicknameHint")}
          </p>
        </div>
        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="bm">
              {t("child.month")}
            </label>
            <select
              id="bm"
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">{t("child.pick")}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {t(`month.${m}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="by">
              {t("child.year")}
            </label>
            <select
              id="by"
              className="input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">{t("child.pick")}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p role="alert" className="input-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block">
            {t("common.next")}
          </button>
          {back}
        </div>
      </form>
    );
  }

  if (step === 2) {
    return (
      <div className="flow">
        <div className="flow-s">
          <p className="step-label">{t("onboard.step", { n: 2 })}</p>
          <h1 ref={heading} tabIndex={-1} className="t-title">
            {t("onboard.where", { name: name.trim() })}
          </h1>
          <p className="muted">{t("onboard.whereHint")}</p>
        </div>
        <div
          className="toggle-chips"
          role="group"
          aria-label={t("onboard.where", { name: name.trim() })}
        >
          {HOME_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className="toggle-chip"
              aria-pressed={picked.includes(k)}
              onClick={() => toggleHome(k)}
            >
              <span className="toggle-chip-mark" aria-hidden="true">
                {picked.includes(k) && <Check size={14} weight="bold" />}
              </span>
              {t(`onboard.home.${k}`)}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="input-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={next2}>
            {t("common.next")}
          </button>
          {back}
        </div>
      </div>
    );
  }

  return (
    <div className="flow">
      <div className="flow-s">
        <p className="step-label">{t("onboard.step", { n: 3 })}</p>
        <h1 ref={heading} tabIndex={-1} className="t-title">
          {t("onboard.rooms")}
        </h1>
        <p className="muted">{t("onboard.roomsHint")}</p>
      </div>
      <div className="room-plan">
        {HOME_KEYS.filter((k) => picked.includes(k)).map((k) => (
          <div key={k} className="room-plan-row">
            <p className="t-strong">{t(`onboard.home.${k}`)}</p>
            {editing && rooms ? (
              <div className="toggle-chips" role="group" aria-label={t(`onboard.home.${k}`)}>
                {ROOMS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="toggle-chip"
                    aria-pressed={rooms[k].includes(r)}
                    onClick={() => toggleRoom(k, r)}
                  >
                    <span className="toggle-chip-mark" aria-hidden="true">
                      {rooms[k].includes(r) && <Check size={14} weight="bold" />}
                    </span>
                    {t(`room.${r}`)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                {ROOMS.filter((r) => rooms?.[k].includes(r))
                  .map((r) => t(`room.${r}`))
                  .join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="input-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={finish}>
          {t("onboard.looksRight")}
        </button>
        {!editing && (
          <button type="button" className="btn btn-block" onClick={() => setEditing(true)}>
            {t("onboard.editRooms")}
          </button>
        )}
        {back}
      </div>
    </div>
  );
}
