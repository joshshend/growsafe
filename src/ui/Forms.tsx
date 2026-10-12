// Add another child or home after onboarding.
import { useState, type FormEvent } from "react";
import { Check } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { ROOMS, type Room } from "../kb/schema";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";
import { useT } from "./useT";

export function ChildForm() {
  const t = useT();
  const nav = useNavigate();
  const addChild = useStore((s) => s.addChild);
  const setActive = useUi((s) => s.setActiveChild);
  const now = new Date();
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("child.errorName"));
    if (!month || !year) return setError(t("child.errorBirth"));
    if (
      Number(year) > now.getFullYear() ||
      (Number(year) === now.getFullYear() && Number(month) > now.getMonth() + 1)
    )
      return setError(t("child.errorFuture"));
    setActive(addChild(name, Number(month), Number(year)));
    nav("/");
  }

  return (
    <form className="flow" onSubmit={submit} noValidate>
      <h1 className="t-title">{t("child.title")}</h1>
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
          <select id="by" className="input" value={year} onChange={(e) => setYear(e.target.value)}>
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
          {t("child.submit")}
        </button>
        <Link to="/people" className="btn btn-text btn-block">
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}

const DEFAULT_ROOMS: Room[] = ["living_room", "kitchen", "bedroom", "bathroom", "stairs"];

export function HomeForm() {
  const t = useT();
  const nav = useNavigate();
  const addHome = useStore((s) => s.addHome);
  const [name, setName] = useState("");
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [error, setError] = useState("");

  function toggle(r: Room) {
    setRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("home.errorName"));
    if (rooms.length === 0) return setError(t("home.errorRooms"));
    addHome(
      name,
      ROOMS.filter((r) => rooms.includes(r)),
    );
    nav("/rooms");
  }

  return (
    <form className="flow" onSubmit={submit} noValidate>
      <h1 className="t-title">{t("home.title")}</h1>
      <div className="field">
        <label className="field-label" htmlFor="hname">
          {t("home.name")}
        </label>
        <input
          id="hname"
          className="input"
          value={name}
          maxLength={50}
          placeholder={t("home.namePlaceholder")}
          autoComplete="off"
          aria-describedby="hname-hint"
          onChange={(e) => setName(e.target.value)}
        />
        <p id="hname-hint" className="field-hint">
          {t("home.nameHint")}
        </p>
      </div>
      <fieldset className="field">
        <legend className="field-label">{t("home.rooms")}</legend>
        <p className="field-hint">{t("home.roomsHint")}</p>
        <div className="toggle-chips">
          {ROOMS.map((r) => (
            <button
              key={r}
              type="button"
              className="toggle-chip"
              aria-pressed={rooms.includes(r)}
              onClick={() => toggle(r)}
            >
              <span className="toggle-chip-mark" aria-hidden="true">
                {rooms.includes(r) && <Check size={14} weight="bold" />}
              </span>
              {t(`room.${r}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="input-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-block">
          {t("home.submit")}
        </button>
        <Link to="/rooms" className="btn btn-text btn-block">
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
