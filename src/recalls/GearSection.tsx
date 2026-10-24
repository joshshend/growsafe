// "Gear" section of the Rooms tab: list, add sheet, checklist sheet and recall results sheet.
import { useEffect, useId, useState, type FormEvent } from "react";
import { CheckCircle, Plus, Warning } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store/store";
import { Sheet } from "../ui/Sheet";
import { useUi } from "../ui/ui-state";
import { useLang, useT, type TFn } from "../ui/useT";
import { SAFERPRODUCTS_URL } from "./cpscClient";
import { checklistFor } from "./gear";
import { GEAR_KINDS } from "./products";
import { activeMatches, type GearItem, type GearType } from "./types";
import { useRecallCheck } from "./useRecallCheck";
import "./gear.css";

function dateText(iso: string, lang: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { dateStyle: "medium" });
}
const gearName = (t: TFn, g: Pick<GearItem, "brand" | "type">) =>
  t("gear.name", { brand: g.brand, type: t(`gear.type.${g.type}`) });

export function GearSection() {
  const t = useT();
  const lang = useLang();
  const homes = useStore((s) => s.homes);
  const gear = useStore((s) => s.gear);
  const removeGear = useStore((s) => s.removeGear);
  const [adding, setAdding] = useState(false);
  const [list, setList] = useState<string | null>(null);
  const [recalls, setRecalls] = useState<{ id: string; run: boolean } | null>(null);
  const [params, setParams] = useSearchParams();
  const target = params.get("gear");

  // Arriving from the Today banner (?gear=<id>): show that item's saved recall result once.
  useEffect(() => {
    if (target && gear.some((g) => g.id === target)) {
      setRecalls({ id: target, run: false });
      setParams({}, { replace: true });
    }
  }, [target, gear, setParams]);

  if (homes.length === 0) return null;
  return (
    <section className="flow-s" aria-labelledby="gear-h">
      <div className="section-head">
        <h2 id="gear-h" className="t-section">
          {t("gear.title")}
        </h2>
      </div>
      <p className="muted">{t("gear.sub")}</p>
      {gear.length === 0 ? (
        <p className="muted">{t("gear.empty")}</p>
      ) : (
        <ul className="gear-list">
          {gear.map((g) => {
            const name = gearName(t, g);
            const flagged = activeMatches(g).length > 0;
            return (
              <li key={g.id} className={`gear-item${target === g.id ? " is-target" : ""}`}>
                <div className="gear-head">
                  <span className="gear-name">{name}</span>
                  {g.secondHand && <span className="gear-chip">{t("gear.secondHandTag")}</span>}
                  {flagged ? (
                    <span className="gear-chip is-warn">
                      <Warning size={18} weight="duotone" aria-hidden="true" />
                      {t("gear.status.possible")}
                    </span>
                  ) : g.lastChecked ? (
                    <span className="gear-chip is-ok">
                      <CheckCircle size={18} weight="duotone" aria-hidden="true" />
                      {t("gear.status.checked", { date: dateText(g.lastChecked, lang) })}
                    </span>
                  ) : (
                    <span className="gear-chip">{t("gear.status.none")}</span>
                  )}
                </div>
                <div className="gear-actions">
                  <button type="button" className="btn" onClick={() => setList(g.id)}>
                    {t("gear.runChecklist")}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setRecalls({ id: g.id, run: true })}
                  >
                    {t("gear.checkRecalls")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-text"
                    aria-label={t("gear.removeLabel", { name })}
                    onClick={() => removeGear(g.id)}
                  >
                    {t("gear.remove")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="btn btn-block" onClick={() => setAdding(true)}>
        <Plus size={20} weight="bold" aria-hidden="true" />
        {t("gear.add")}
      </button>
      {adding && <AddGearSheet onClose={() => setAdding(false)} />}
      {list && <ChecklistSheet gearId={list} onClose={() => setList(null)} />}
      {recalls && (
        <RecallSheet gearId={recalls.id} autoRun={recalls.run} onClose={() => setRecalls(null)} />
      )}
    </section>
  );
}

function AddGearSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const uid = useId();
  const homes = useStore((s) => s.homes);
  const addGear = useStore((s) => s.addGear);
  const [type, setType] = useState<GearType>("crib");
  const [homeId, setHomeId] = useState(homes[0]?.id ?? "");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [secondHand, setSecondHand] = useState(false);
  const [labelDate, setLabelDate] = useState("");
  const [error, setError] = useState("");
  const seat = type === "car_seat" || type === "booster";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!brand.trim()) return setError(t("gear.brandRequired"));
    const y = Number(year);
    addGear({
      homeId,
      type,
      brand: brand.trim(),
      secondHand,
      ...(model.trim() && { model: model.trim() }),
      ...(Number.isInteger(y) && y >= 1950 && y <= 2100 && { year: y }),
      ...(seat && labelDate.trim() && { labelDate: labelDate.trim() }),
    });
    onClose();
  }

  return (
    <Sheet title={t("gear.addTitle")} onClose={onClose}>
      <form className="flow-s" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor={`${uid}-type`}>
            {t("gear.type")}
          </label>
          <select
            id={`${uid}-type`}
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as GearType)}
          >
            {GEAR_KINDS.map((k) => (
              <option key={k.type} value={k.type}>
                {t(`gear.type.${k.type}`)}
              </option>
            ))}
          </select>
        </div>
        {homes.length > 1 && (
          <div className="field">
            <label className="field-label" htmlFor={`${uid}-home`}>
              {t("gear.home")}
            </label>
            <select
              id={`${uid}-home`}
              className="input"
              value={homeId}
              onChange={(e) => setHomeId(e.target.value)}
            >
              {homes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label className="field-label" htmlFor={`${uid}-brand`}>
            {t("gear.brand")}
          </label>
          <input
            id={`${uid}-brand`}
            className="input"
            value={brand}
            autoComplete="off"
            aria-describedby={`${uid}-brand-hint`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setBrand(e.target.value);
              setError("");
            }}
          />
          <span id={`${uid}-brand-hint`} className="field-hint">
            {t("gear.brandHint")}
          </span>
          {error && (
            <p role="alert" className="input-error">
              {error}
            </p>
          )}
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${uid}-model`}>
            {t("gear.model")}
          </label>
          <input
            id={`${uid}-model`}
            className="input"
            value={model}
            autoComplete="off"
            aria-describedby={`${uid}-model-hint`}
            onChange={(e) => setModel(e.target.value)}
          />
          <span id={`${uid}-model-hint`} className="field-hint">
            {t("gear.modelHint")}
          </span>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${uid}-year`}>
            {t("gear.year")}
          </label>
          <input
            id={`${uid}-year`}
            className="input"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        <fieldset className="field">
          <legend className="field-label">{t("gear.secondHand")}</legend>
          <div className="seg">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                className="seg-btn"
                aria-pressed={secondHand === v}
                onClick={() => setSecondHand(v)}
              >
                {t(v ? "gear.yes" : "gear.no")}
              </button>
            ))}
          </div>
        </fieldset>
        {seat && (
          <div className="field">
            <label className="field-label" htmlFor={`${uid}-label`}>
              {t("gear.labelDate")}
            </label>
            <input
              id={`${uid}-label`}
              className="input"
              value={labelDate}
              aria-describedby={`${uid}-label-hint`}
              onChange={(e) => setLabelDate(e.target.value)}
            />
            <span id={`${uid}-label-hint`} className="field-hint">
              {t("gear.labelNote")}
            </span>
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block">
            {t("gear.save")}
          </button>
          <button type="button" className="btn btn-text btn-block" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function ChecklistSheet({ gearId, onClose }: { gearId: string; onClose: () => void }) {
  const t = useT();
  const g = useStore((s) => s.gear.find((x) => x.id === gearId));
  const setAnswers = useStore((s) => s.setGearAnswers);
  const showToast = useUi((s) => s.showToast);
  const lang = useLang();
  const [answers, setLocal] = useState<Record<string, "yes" | "no">>(g?.answers ?? {});
  if (!g) return null;
  const items = checklistFor(g.type);
  const seat = g.type === "car_seat" || g.type === "booster";

  function save() {
    const before = g?.answers ?? {};
    const added = Object.entries(answers).filter(([id, a]) => a === "no" && before[id] !== "no");
    setAnswers(gearId, answers);
    showToast({
      message: added.length
        ? t("gear.checklistAdded", { n: added.length })
        : t("gear.checklistNone"),
    });
    onClose();
  }

  return (
    <Sheet
      title={t("gear.checklistTitle", { name: gearName(t, g) })}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          {t("gear.checklistSave")}
        </button>
      }
    >
      <p className="muted">{t("gear.checklistIntro")}</p>
      {seat && (
        <p className="gear-note">
          {g.labelDate ? `${g.labelDate}. ` : ""}
          {t("gear.labelNote")}
        </p>
      )}
      {items.map((it) => (
        <fieldset key={it.id} className="gear-q">
          <legend>{lang === "es" && it.es ? it.es.q : it.q}</legend>
          <div className="seg">
            {(["yes", "no"] as const).map((a) => (
              <button
                key={a}
                type="button"
                className="seg-btn"
                aria-pressed={answers[it.id] === a}
                onClick={() => setLocal((cur) => ({ ...cur, [it.id]: a }))}
              >
                {t(a === "yes" ? "gear.yes" : "gear.no")}
              </button>
            ))}
          </div>
          <a className="gear-src" href={it.source.url} target="_blank" rel="noopener noreferrer">
            {t("gear.source", { publisher: it.source.publisher })}
          </a>
        </fieldset>
      ))}
      <p className="gear-note">{t("gear.notGuarantee")}</p>
    </Sheet>
  );
}

function RecallSheet({
  gearId,
  autoRun,
  onClose,
}: {
  gearId: string;
  autoRun: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const g = useStore((s) => s.gear.find((x) => x.id === gearId));
  const dismiss = useStore((s) => s.dismissRecall);
  const check = useRecallCheck();
  const [busy, setBusy] = useState(autoRun);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!autoRun) return;
    let live = true;
    void check(gearId).then((out) => {
      if (!live) return;
      setOffline(out !== null && !out.ok);
      setBusy(false);
    });
    return () => {
      live = false;
    };
  }, [autoRun, gearId, check]);

  if (!g) return null;
  const matches = activeMatches(g);
  const lastDate = g.lastChecked ? dateText(g.lastChecked, lang) : "";
  return (
    <Sheet title={t("gear.recallsTitle", { name: gearName(t, g) })} onClose={onClose}>
      <div role="status" aria-live="polite" className="flow-s">
        {busy && <p className="muted">{t("gear.checking")}</p>}
        {!busy && offline && (
          <p className="gear-note">
            {g.lastChecked ? t("gear.offlineSaved", { date: lastDate }) : t("gear.offlineNone")}
          </p>
        )}
        {!busy && !offline && lastDate && (
          <p className="gear-note">{t("gear.lastChecked", { date: lastDate })}</p>
        )}
      </div>
      {!busy && g.lastChecked && matches.length === 0 && (
        <p className="row-title">{t("gear.noRecalls")}</p>
      )}
      {matches.map((m) => (
        <div key={m.recallId} className="gear-match">
          <span className="gear-match-title">{m.title}</span>
          {m.date && (
            <span className="gear-note">
              {t("gear.recalledOn", { date: dateText(m.date, lang) })}
            </span>
          )}
          {m.hazard && <span>{m.hazard}</span>}
          <span className="gear-note">{t("gear.possibleMatch")}</span>
          {m.modelMentioned && <span className="gear-note">{t("gear.modelMentioned")}</span>}
          <a className="btn" href={m.url} target="_blank" rel="noopener noreferrer">
            {t("gear.openNotice")}
          </a>
          <button type="button" className="btn btn-text" onClick={() => dismiss(g.id, m.recallId)}>
            {t("gear.notMine")}
          </button>
        </div>
      ))}
      <p className="gear-note">{t("gear.noRecallsNote")}</p>
      <a
        className="btn btn-block"
        href={SAFERPRODUCTS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("gear.saferProducts")}
      </a>
      <p className="gear-note">{t("gear.notGuarantee")}</p>
    </Sheet>
  );
}
