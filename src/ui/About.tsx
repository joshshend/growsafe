import { useState } from "react";
import { useStore } from "../store/store";
import type { Lang } from "../i18n/t";
import { useLang, useT } from "./useT";

export function About() {
  const t = useT();
  const lang = useLang();
  const largeText = useStore((s) => s.settings.largeText);
  const setSettings = useStore((s) => s.setSettings);
  const reset = useStore((s) => s.reset);
  const [armed, setArmed] = useState(false);
  const [erased, setErased] = useState(false);
  const langs: Lang[] = ["en", "es"];

  return (
    <div className="stack">
      <h1>{t("about.title")}</h1>
      <section className="stack-s" aria-labelledby="priv">
        <h2 id="priv">{t("about.privacy")}</h2>
        <p>{t("about.privacyText")}</p>
      </section>
      <section className="stack-s" aria-labelledby="ai">
        <h2 id="ai">{t("about.ai")}</h2>
        <p>{t("about.aiText")}</p>
      </section>
      <section className="stack-s" aria-labelledby="lim">
        <h2 id="lim">{t("about.limits")}</h2>
        <p>{t("about.limitsText")}</p>
      </section>
      <section className="card stack-s" aria-labelledby="set">
        <h2 id="set">{t("about.settings")}</h2>
        <div role="group" aria-label={t("about.language")} className="chips">
          {langs.map((l) => (
            <button
              key={l}
              type="button"
              className="chip"
              aria-pressed={lang === l}
              onClick={() => setSettings({ lang: l })}
            >
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        <label className={`check${largeText ? " on" : ""}`}>
          <input
            type="checkbox"
            checked={largeText}
            onChange={(e) => setSettings({ largeText: e.target.checked })}
          />
          <span>{t("about.largeText")}</span>
        </label>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!armed) return setArmed(true);
            reset();
            setArmed(false);
            setErased(true);
          }}
        >
          {armed ? t("about.resetConfirm") : t("about.reset")}
        </button>
        {erased && <p role="status">{t("about.resetDone")}</p>}
      </section>
    </div>
  );
}
