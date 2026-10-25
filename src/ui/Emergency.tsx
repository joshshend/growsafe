// Emergency card per child (T6). Free text only, saved in IndexedDB on this device, never shared.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { LockSimple } from "@phosphor-icons/react";
import { CONTACT_SLOTS, MAX_FIELD, emptyCard, useEmergency, type Card } from "../emergency/store";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";
import { useT } from "./useT";
import "./emergency.css";

function Area({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="input input-area"
        value={value}
        maxLength={MAX_FIELD}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

function Line({
  id,
  label,
  type = "text",
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: "text" | "tel";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        inputMode={type === "tel" ? "tel" : undefined}
        autoComplete="off"
        maxLength={120}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function EmergencyCard() {
  const t = useT();
  const { childId = "" } = useParams();
  const child = useStore((s) => s.children.find((c) => c.id === childId));
  const hydrated = useEmergency((s) => s.hydrated);
  const saved = useEmergency((s) => s.cards[childId]);
  const hydrate = useEmergency((s) => s.hydrate);
  const saveCard = useEmergency((s) => s.saveCard);
  const clearCard = useEmergency((s) => s.clearCard);
  const showToast = useUi((s) => s.showToast);
  const [card, setCard] = useState<Card>(() => saved ?? emptyCard());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  // Fill the form once, when storage has been read (or the child changes).
  useEffect(() => {
    if (!hydrated) return;
    setCard(useEmergency.getState().cards[childId] ?? emptyCard());
    setLoaded(true);
  }, [hydrated, childId]);

  if (!child) {
    return (
      <div className="flow">
        <p role="alert">{t("em.notFound")}</p>
        <Link className="btn btn-block" to="/people">
          {t("em.back")}
        </Link>
      </div>
    );
  }

  const set = <K extends keyof Card>(k: K, v: Card[K]) => setCard((c) => ({ ...c, [k]: v }));
  const setContact = (i: number, k: "name" | "phone", v: string) =>
    setCard((c) => ({
      ...c,
      contacts: c.contacts.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
    }));

  function submit(e: FormEvent) {
    e.preventDefault();
    saveCard(childId, card);
    showToast({ message: t("em.saved") });
  }

  return (
    <form className="flow" onSubmit={submit} noValidate>
      <h1 className="t-title">{t("em.title", { name: child.nickname })}</h1>
      <p className="notice">
        <LockSimple size={24} weight="regular" aria-hidden="true" />
        <span>{t("em.local")}</span>
      </p>
      {loaded && (
        <>
          <Area
            id="em-allergies"
            label={t("em.allergies")}
            hint={t("em.allergiesHint")}
            value={card.allergies}
            onChange={(v) => set("allergies", v)}
          />
          <Area
            id="em-conditions"
            label={t("em.conditions")}
            value={card.conditions}
            onChange={(v) => set("conditions", v)}
          />
          <Area
            id="em-medicines"
            label={t("em.medicines")}
            hint={t("em.medicinesHint")}
            value={card.medicines}
            onChange={(v) => set("medicines", v)}
          />
          <fieldset className="flow-s" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="t-section">{t("em.pediatrician")}</legend>
            <Line
              id="em-ped-name"
              label={t("em.pedName")}
              value={card.pediatricianName}
              onChange={(v) => set("pediatricianName", v)}
            />
            <Line
              id="em-ped-phone"
              type="tel"
              label={t("em.pedPhone")}
              value={card.pediatricianPhone}
              onChange={(v) => set("pediatricianPhone", v)}
            />
          </fieldset>
          <fieldset className="flow-s" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="t-section">{t("em.contacts")}</legend>
            {Array.from({ length: CONTACT_SLOTS }, (_, i) => (
              <div key={i} className="form-row">
                <Line
                  id={`em-c${i}-name`}
                  label={t("em.contactName", { n: i + 1 })}
                  value={card.contacts[i]?.name ?? ""}
                  onChange={(v) => setContact(i, "name", v)}
                />
                <Line
                  id={`em-c${i}-phone`}
                  type="tel"
                  label={t("em.contactPhone", { n: i + 1 })}
                  value={card.contacts[i]?.phone ?? ""}
                  onChange={(v) => setContact(i, "phone", v)}
                />
              </div>
            ))}
          </fieldset>
        </>
      )}
      <p className="fine">{t("em.poisonLine")}</p>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-block">
          {t("em.save")}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => {
            clearCard(childId);
            setCard(emptyCard());
            showToast({ message: t("em.cleared") });
          }}
        >
          {t("em.clear")}
        </button>
        <Link to="/people" className="btn btn-text btn-block">
          {t("em.back")}
        </Link>
      </div>
    </form>
  );
}
