import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROOMS, type Room } from "../kb/schema";
import { useStore } from "../store/store";
import { useT } from "./useT";

export function ChildForm() {
  const t = useT();
  const nav = useNavigate();
  const addChild = useStore((s) => s.addChild);
  const now = new Date();
  const [name, setName] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState("");
  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - i);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("child.errorName"));
    if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1))
      return setError(t("child.errorFuture"));
    addChild(name, month, year);
    nav("/");
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <h1>{t("child.title")}</h1>
      <div className="field">
        <label htmlFor="nick">{t("child.nickname")}</label>
        <input
          id="nick"
          value={name}
          maxLength={40}
          autoComplete="off"
          aria-describedby="nick-hint"
          onChange={(e) => setName(e.target.value)}
        />
        <p id="nick-hint" className="hint">
          {t("child.nicknameHint")}
        </p>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="bm">{t("child.month")}</label>
          <select id="bm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {t(`month.${m}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="by">{t("child.year")}</label>
          <select id="by" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="btn primary big">
        {t("child.submit")}
      </button>
      <Link to="/" className="btn ghost">
        {t("common.cancel")}
      </Link>
    </form>
  );
}

const DEFAULT_ROOMS: Room[] = ["living_room", "bedroom", "kitchen", "bathroom"];

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
    nav("/");
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <h1>{t("home.title")}</h1>
      <div className="field">
        <label htmlFor="hname">{t("home.name")}</label>
        <input
          id="hname"
          value={name}
          maxLength={50}
          placeholder={t("home.namePlaceholder")}
          autoComplete="off"
          aria-describedby="hname-hint"
          onChange={(e) => setName(e.target.value)}
        />
        <p id="hname-hint" className="hint">
          {t("home.nameHint")}
        </p>
      </div>
      <fieldset className="field">
        <legend>{t("home.rooms")}</legend>
        <p className="hint">{t("home.roomsHint")}</p>
        <div className="checks">
          {ROOMS.map((r) => (
            <label key={r} className={`check${rooms.includes(r) ? " on" : ""}`}>
              <input type="checkbox" checked={rooms.includes(r)} onChange={() => toggle(r)} />
              <span>{t(`room.${r}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="btn primary big">
        {t("home.submit")}
      </button>
      <Link to="/" className="btn ghost">
        {t("common.cancel")}
      </Link>
    </form>
  );
}
