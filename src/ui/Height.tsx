// Height tracker ("Mia's doorframe", T25): pencil marks on a doorframe, a list, and a form to add a mark.
// A record only: no percentiles, no "normal" range, no advice.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  checkMark,
  growthSince,
  newestFirst,
  parseHeight,
  toUnit,
  todayIso,
  CM_PER_IN,
  unitLimits,
  type HeightMark,
  type HeightUnit,
  type MarkError,
} from "../height/height";
import { useHeights } from "../height/store";
import { useStore } from "../store/store";
import { HeightFrame } from "./HeightFrame";
import { Sheet } from "./Sheet";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";
import "./height.css";

const NO_MARKS: HeightMark[] = [];

function useFormat(unit: HeightUnit) {
  const t = useT();
  const lang = useLang();
  return useMemo(() => {
    const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
    const unitText = unit === "cm" ? "cm" : t("height.unit.in");
    return {
      unitText,
      num: (n: number) => nf.format(n),
      value: (n: number) => `${nf.format(n)} ${unitText}`,
      date: (iso: string) => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y!, m! - 1, d!).toLocaleDateString(lang, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      },
    };
  }, [lang, unit, t]);
}

interface FieldsValue {
  height: string;
  date: string;
  note: string;
}

// Height, date and note, used by the add form and the edit sheet.
function MarkFields({
  idPrefix,
  value,
  onChange,
  unit,
  onUnit,
  error,
  today,
}: {
  idPrefix: string;
  value: FieldsValue;
  onChange: (v: FieldsValue) => void;
  unit: HeightUnit;
  onUnit: (u: HeightUnit) => void;
  error: MarkError | null;
  today: string;
}) {
  const t = useT();
  const f = useFormat(unit);
  const lim = unitLimits(unit);
  const errText =
    error === "height"
      ? t("height.err.height", { min: f.num(lim.min), max: f.num(lim.max), unit: f.unitText })
      : error === "date"
        ? t("height.err.date")
        : error === "future"
          ? t("height.err.future")
          : "";
  const pickUnit = (u: HeightUnit) => {
    if (u === unit) return;
    const typed = parseHeight(value.height);
    if (typed !== null) {
      const cm = unit === "cm" ? typed : typed * CM_PER_IN;
      const next = u === "cm" ? Math.round(cm * 10) / 10 : Math.round((cm / CM_PER_IN) * 10) / 10;
      onChange({ ...value, height: String(next) });
    }
    onUnit(u);
  };
  return (
    <>
      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-h`}>
            {t("height.field.height")} ({f.unitText})
          </label>
          <input
            id={`${idPrefix}-h`}
            className="input"
            inputMode="decimal"
            autoComplete="off"
            value={value.height}
            aria-invalid={error === "height" || undefined}
            aria-describedby={error ? `${idPrefix}-err` : undefined}
            onChange={(e) => onChange({ ...value, height: e.target.value })}
          />
        </div>
        <div className="field hf-unit" role="group" aria-labelledby={`${idPrefix}-u`}>
          <span id={`${idPrefix}-u`} className="field-label">
            {t("height.field.unit")}
          </span>
          <div className="seg">
            {(["cm", "in"] as const).map((u) => (
              <button
                key={u}
                type="button"
                className="seg-btn"
                aria-pressed={unit === u}
                aria-label={u === "cm" ? "cm" : t("height.unit.inLong")}
                onClick={() => pickUnit(u)}
              >
                {u === "cm" ? "cm" : t("height.unit.in")}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-d`}>
          {t("height.field.date")}
        </label>
        <input
          id={`${idPrefix}-d`}
          className="input"
          type="date"
          max={today}
          value={value.date}
          aria-invalid={error === "date" || error === "future" || undefined}
          aria-describedby={error ? `${idPrefix}-err` : undefined}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-n`}>
          {t("height.field.note")}
        </label>
        <input
          id={`${idPrefix}-n`}
          className="input"
          maxLength={80}
          autoComplete="off"
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </div>
      {errText && (
        <p id={`${idPrefix}-err`} role="alert" className="input-error">
          {errText}
        </p>
      )}
    </>
  );
}

function EditSheet({
  childId,
  mark,
  onClose,
}: {
  childId: string;
  mark: HeightMark;
  onClose: () => void;
}) {
  const t = useT();
  const unit = useHeights((s) => s.unit);
  const setUnit = useHeights((s) => s.setUnit);
  const update = useHeights((s) => s.update);
  const [v, setV] = useState<FieldsValue>({
    height: String(toUnit(mark.cm, unit)),
    date: mark.date,
    note: mark.note ?? "",
  });
  const [error, setError] = useState<MarkError | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = checkMark({ height: v.height, unit, date: v.date, note: v.note }, todayIso());
    if (!r.ok) return setError(r.error);
    update(childId, mark.id, r.mark);
    onClose();
  };
  return (
    <Sheet title={t("height.editTitle")} onClose={onClose}>
      <form className="flow" onSubmit={submit} noValidate>
        <MarkFields
          idPrefix="he"
          value={v}
          onChange={setV}
          unit={unit}
          onUnit={setUnit}
          error={error}
          today={todayIso()}
        />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block">
            {t("height.save")}
          </button>
          <button type="button" className="btn btn-block" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export function Height() {
  const t = useT();
  const nav = useNavigate();
  const { childId } = useParams();
  const active = useActiveChild();
  const children = useStore((s) => s.children);
  const setActiveChild = useUi((s) => s.setActiveChild);
  const showToast = useUi((s) => s.showToast);
  const child = children.find((c) => c.id === childId) ?? (childId ? null : active);

  const hydrate = useHeights((s) => s.hydrate);
  const unit = useHeights((s) => s.unit);
  const setUnit = useHeights((s) => s.setUnit);
  const add = useHeights((s) => s.add);
  const remove = useHeights((s) => s.remove);
  const restore = useHeights((s) => s.restore);
  const marks = useHeights((s) => (child ? (s.marks[child.id] ?? NO_MARKS) : NO_MARKS));
  const f = useFormat(unit);

  const [v, setV] = useState<FieldsValue>({ height: "", date: todayIso(), note: "" });
  const [error, setError] = useState<MarkError | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [editing, setEditing] = useState<HeightMark | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!child) return <Navigate to="/people" replace />;

  const sorted = newestFirst(marks);
  const newest = sorted[0] ?? null;
  const growth = growthSince(marks);
  const name = child.nickname;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = checkMark({ height: v.height, unit, date: v.date, note: v.note }, todayIso());
    if (!r.ok) return setError(r.error);
    const mark = add(child.id, r.mark);
    setError(null);
    setJustAdded(mark.id);
    setV({ height: "", date: todayIso(), note: "" });
    showToast({
      message: t("height.added", { height: f.value(toUnit(mark.cm, unit)) }),
      undo: () => remove(child.id, mark.id),
    });
  };

  const growthText = (() => {
    if (!growth) return "";
    const since = f.date(growth.since);
    if (growth.diffCm > 0)
      return t("height.grew", { diff: f.value(toUnit(growth.diffCm, unit)), date: since });
    if (growth.diffCm === 0) return t("height.same", { date: since });
    return t("height.lower", { diff: f.value(toUnit(-growth.diffCm, unit)), date: since });
  })();

  const frameLabel = newest
    ? t("height.frameLabel", {
        n: marks.length,
        height: f.value(toUnit(newest.cm, unit)),
        date: f.date(newest.date),
      })
    : t("height.frameLabelEmpty");

  return (
    <div className="flow">
      <Link to="/people" className="back">
        <CaretLeft size={20} weight="bold" aria-hidden="true" />
        {t("people.title")}
      </Link>
      <h1 className="t-title">{t("height.title", { name })}</h1>
      <p className="muted">{t("height.lead", { name })}</p>

      {children.length > 1 && (
        <section className="hf-pick flow-s" role="group" aria-label={t("height.pickChild")}>
          <div className="toggle-chips">
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                className="toggle-chip"
                aria-pressed={c.id === child.id}
                onClick={() => {
                  setActiveChild(c.id);
                  nav(`/height/${c.id}`, { replace: true });
                }}
              >
                {c.nickname}
              </button>
            ))}
          </div>
        </section>
      )}

      {growthText && <p className="hf-grew">{growthText}</p>}

      <div className="hf-wrap">
        <HeightFrame
          marks={marks}
          unit={unit}
          label={frameLabel}
          formatValue={f.value}
          formatDate={f.date}
          newestId={newest?.id ?? null}
          animateId={justAdded}
        />
        {marks.length === 0 && <p className="hf-empty muted">{t("height.empty", { name })}</p>}
      </div>

      <section className="flow-s" aria-labelledby="hf-add">
        <h2 id="hf-add" className="t-section">
          {t("height.addTitle")}
        </h2>
        <form className="flow" onSubmit={submit} noValidate>
          <MarkFields
            idPrefix="ha"
            value={v}
            onChange={setV}
            unit={unit}
            onUnit={setUnit}
            error={error}
            today={todayIso()}
          />
          <button type="submit" className="btn btn-primary btn-block">
            {t("height.add")}
          </button>
        </form>
      </section>

      {sorted.length > 0 && (
        <section aria-labelledby="hf-list">
          <h2 id="hf-list" className="t-section section-head">
            {t("height.listTitle")}
          </h2>
          <ul className="rows">
            {sorted.map((m) => (
              <li key={m.id} className="row">
                <div className="row-body hf-row-main">
                  <span className="row-title">{f.value(toUnit(m.cm, unit))}</span>
                  <span className="row-sub">{f.date(m.date)}</span>
                  {m.note && <span className="row-sub hf-note">{m.note}</span>}
                </div>
                <div className="hf-row-actions">
                  <button
                    type="button"
                    className="btn btn-text"
                    aria-label={t("height.editLabel", { date: f.date(m.date) })}
                    onClick={() => setEditing(m)}
                  >
                    {t("height.edit")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-text"
                    aria-label={t("height.deleteLabel", { date: f.date(m.date) })}
                    onClick={() => {
                      remove(child.id, m.id);
                      showToast({
                        message: t("height.deleted"),
                        undo: () => restore(child.id, m),
                      });
                    }}
                  >
                    {t("height.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="fine">{t("height.disclaimer")}</p>

      {editing && <EditSheet childId={child.id} mark={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
