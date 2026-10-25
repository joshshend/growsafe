import { useMemo, useState } from "react";
import { ArrowSquareOut, Phone } from "@phosphor-icons/react";
import { helpResources } from "../help";
import { listResources, parseZip, type ScopeFilter } from "../help/filter";
import type { HelpEntry } from "../help/schema";
import { useLang, useT } from "./useT";
import "./help.css";

const ZIP_KEY = "growsafe.helpZip";
const SCOPES: ScopeFilter[] = ["all", "texas", "national"];

// Zip is a per-device convenience: every storage call is guarded.
function readZip(): string {
  try {
    return localStorage.getItem(ZIP_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeZip(v: string) {
  try {
    if (v) localStorage.setItem(ZIP_KEY, v);
    else localStorage.removeItem(ZIP_KEY);
  } catch {
    /* storage unavailable: the field still works for this visit */
  }
}

export function Help() {
  const t = useT();
  const lang = useLang();
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [zipText, setZipText] = useState(readZip);
  const zip = parseZip(zipText);
  const groups = useMemo(() => listResources(helpResources, { scope, zip }), [scope, zip]);

  const onZip = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 5);
    setZipText(clean);
    writeZip(parseZip(clean) ? clean : "");
  };

  return (
    <div className="flow">
      <h1 className="d4">{t("help.title")}</h1>
      <div className="help-emergency">
        <p className="lbl">{t("help.swallowed")}</p>
        <a
          className="btn btn-danger btn-block btn-tall"
          href="tel:+18002221222"
          aria-label={t("poison.label")}
        >
          <span className="t2b" aria-hidden="true">
            {t("poison.call")}
          </span>
          <span className="d3" aria-hidden="true">
            {t("poison.number")}
          </span>
        </a>
        <p className="t1 muted">{t("help.poisonText")}</p>
        <p className="t2 help-911-text">{t("help.call911")}</p>
        <a className="btn btn-danger-line btn-block" href="tel:911">
          {t("help.call911Btn")}
        </a>
      </div>

      <hr className="hr" />

      <section className="flow" aria-labelledby="help-list">
        <h2 id="help-list" className="lbl">
          {t("help.listTitle")}
        </h2>
        <div className="help-filters">
          <div role="group" aria-label={t("help.filterLabel")} className="toggle-chips">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                className="toggle-chip"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
              >
                {t(`help.scope.${s}`)}
              </button>
            ))}
          </div>
          <div className="field help-zip">
            <label className="field-label" htmlFor="help-zip">
              {t("help.zipLabel")}
            </label>
            <input
              id="help-zip"
              className="input"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={zipText}
              aria-describedby="help-zip-hint"
              onChange={(e) => onZip(e.target.value)}
            />
            <span id="help-zip-hint" className="field-hint">
              {zipText && !zip ? t("help.zipInvalid") : t("help.zipHint")}
            </span>
          </div>
        </div>

        {groups.length === 0 && <p className="muted">{t("help.empty")}</p>}
        {groups.map((g) => (
          <section
            key={g.category}
            className="help-group"
            aria-labelledby={`help-cat-${g.category}`}
          >
            <h3 id={`help-cat-${g.category}`} className="t2b">
              {t(`help.cat.${g.category}`)}
            </h3>
            <ul className="help-list">
              {g.entries.map((e) => (
                <ResourceCard key={e.id} entry={e} lang={lang} />
              ))}
            </ul>
          </section>
        ))}
      </section>

      <p className="fine">{t("help.footer")}</p>
      <p className="fine">{t("task.notGuarantee")}</p>
    </div>
  );
}

function ResourceCard({ entry: e, lang }: { entry: HelpEntry; lang: "en" | "es" }) {
  const t = useT();
  const text = lang === "es" && e.es ? e.es : e;
  const scopeKey = e.scope === "national" || e.scope === "texas" ? e.scope : "local";
  const checked = e.verified && e.last_verified;
  const date = checked
    ? new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(`${e.last_verified}T00:00:00Z`),
      )
    : "";
  return (
    <li className={`help-card${checked ? "" : " is-unchecked"}`}>
      <h4 className="row-title help-card-title">{text.title}</h4>
      <p className="row-sub">
        {t(`help.cost.${e.cost}`)} · {t(`help.scopeChip.${scopeKey}`)}
      </p>
      <p className="t2">{text.what}</p>
      <p className="t1 muted">{text.who}</p>
      <div className="help-actions">
        <a
          className={`btn${e.apply_url ? " btn-secondary" : " btn-primary"}`}
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("help.openLabel", { title: text.title })}
        >
          <ArrowSquareOut size={20} aria-hidden="true" />
          {t("help.open")}
        </a>
        {e.apply_url && (
          <a
            className="btn btn-primary"
            href={e.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("help.applyLabel", { title: text.title })}
          >
            {t("help.apply")}
          </a>
        )}
        {e.phone && (
          <a
            className="btn btn-secondary"
            href={e.phone.length <= 3 ? `tel:${e.phone}` : `tel:+${e.phone}`}
            aria-label={t("help.callLabel", { title: text.title })}
          >
            <Phone size={20} aria-hidden="true" />
            {t("help.call")}
          </a>
        )}
      </div>
      <p className="t1 muted help-checked">
        {checked ? t("help.checkedOn", { date }) : t("help.notChecked")}
      </p>
    </li>
  );
}
