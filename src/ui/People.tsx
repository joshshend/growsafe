import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShareNetwork, Printer } from "@phosphor-icons/react";
import { useStore } from "../store/store";
import { ageText } from "./format";
import { Sheet } from "./Sheet";
import { useT } from "./useT";

export function People() {
  const t = useT();
  const children = useStore((s) => s.children);
  const homes = useStore((s) => s.homes);
  const owners = useStore((s) => s.owners);
  const removeChild = useStore((s) => s.removeChild);
  const removeHome = useStore((s) => s.removeHome);
  const [note, setNote] = useState("");
  const [removing, setRemoving] = useState<{ name: string; run: () => void } | null>(null);
  const now = new Date();
  return (
    <div className="flow">
      <h1 className="t-title">{t("people.title")}</h1>
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setNote(t("people.soon"))}
        >
          <ShareNetwork size={22} weight="duotone" aria-hidden="true" />
          {t("people.share")}
        </button>
        <button type="button" className="btn btn-block" onClick={() => setNote(t("people.soon"))}>
          <Printer size={22} weight="duotone" aria-hidden="true" />
          {t("people.briefing")}
        </button>
        <p role="status" className="muted">
          {note}
        </p>
      </div>

      <section aria-labelledby="pc">
        <h2 id="pc" className="t-section section-head">
          {t("people.children")}
        </h2>
        <ul className="rows">
          {children.map((c) => (
            <li key={c.id} className="row">
              <div className="row-body">
                <span className="row-title">{c.nickname}</span>
                <span className="row-sub">{ageText(t, c, now)}</span>
              </div>
              <button
                type="button"
                className="btn btn-text"
                aria-label={t("plan.removeChild", { name: c.nickname })}
                onClick={() => setRemoving({ name: c.nickname, run: () => removeChild(c.id) })}
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
        <Link to="/child/new" className="btn btn-text">
          <Plus size={20} weight="bold" aria-hidden="true" />
          {t("plan.addChild")}
        </Link>
      </section>

      <section aria-labelledby="ph">
        <h2 id="ph" className="t-section section-head">
          {t("people.homes")}
        </h2>
        <ul className="rows">
          {homes.map((h) => (
            <li key={h.id} className="row">
              <div className="row-body">
                <span className="row-title">{h.name}</span>
                <span className="row-sub">{t("plan.roomsCount", { n: h.rooms.length })}</span>
              </div>
              <button
                type="button"
                className="btn btn-text"
                aria-label={t("plan.removeHome", { name: h.name })}
                onClick={() => setRemoving({ name: h.name, run: () => removeHome(h.id) })}
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
        <Link to="/home/new" className="btn btn-text">
          <Plus size={20} weight="bold" aria-hidden="true" />
          {t("plan.addHome")}
        </Link>
      </section>

      <section aria-labelledby="po">
        <h2 id="po" className="t-section section-head">
          {t("people.helpers")}
        </h2>
        {owners.length === 0 ? (
          <p className="muted">{t("people.noHelpers")}</p>
        ) : (
          <ul className="rows">
            {owners.map((o) => (
              <li key={o} className="row">
                <div className="row-body">
                  <span className="row-title">{o}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {removing && (
        <Sheet
          title={t("plan.confirmRemove", { name: removing.name })}
          onClose={() => setRemoving(null)}
        >
          <p className="muted">{t("plan.removeNote")}</p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() => {
                removing.run();
                setRemoving(null);
              }}
            >
              {t("common.remove")}
            </button>
            <button type="button" className="btn btn-block" onClick={() => setRemoving(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
