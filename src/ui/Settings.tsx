import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import type { Lang } from "../i18n/t";
import { Sheet } from "./Sheet";
import { useEasyStore } from "./easy";
import { readTheme, saveTheme, type Theme } from "./theme";
import { useUi } from "./ui-state";
import { useLang, useT } from "./useT";

export function Settings() {
  const t = useT();
  const nav = useNavigate();
  const lang = useLang();
  const largeText = useStore((s) => s.settings.largeText);
  const setSettings = useStore((s) => s.setSettings);
  const reset = useStore((s) => s.reset);
  const easy = useEasyStore((s) => s.easy);
  const setEasy = useEasyStore((s) => s.setEasy);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [confirming, setConfirming] = useState(false);
  const langs: Lang[] = ["en", "es"];
  const themes: Theme[] = ["auto", "light", "dark"];

  return (
    <div className="flow">
      <h1 className="t-title">{t("settings.title")}</h1>
      <div>
        <div className="setting-stack" role="group" aria-labelledby="set-lang">
          <span id="set-lang" className="field-label">
            {t("settings.language")}
          </span>
          <div className="seg">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                className="seg-btn"
                aria-pressed={lang === l}
                onClick={() => setSettings({ lang: l })}
              >
                {t(`lang.${l}`)}
              </button>
            ))}
          </div>
          <p className="fine">{t("i18n.aiNote")}</p>
        </div>
        <div className="setting">
          <span id="set-large">{t("settings.largeText")}</span>
          <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={largeText}
            aria-labelledby="set-large"
            onClick={() => setSettings({ largeText: !largeText })}
          />
        </div>
        <div className="setting">
          <span id="set-easy">
            {t("easy.setting")}
            <span className="row-sub block">{t("easy.settingHint")}</span>
          </span>
          <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={easy}
            aria-labelledby="set-easy"
            onClick={() => setEasy(!easy)}
          />
        </div>
        <div className="setting-stack" role="group" aria-labelledby="set-theme">
          <span id="set-theme" className="field-label">
            {t("settings.appearance")}
          </span>
          <div className="seg">
            {themes.map((m) => (
              <button
                key={m}
                type="button"
                className="seg-btn"
                aria-pressed={theme === m}
                onClick={() => {
                  setTheme(m);
                  saveTheme(m);
                }}
              >
                {t(`theme.${m}`)}
              </button>
            ))}
          </div>
        </div>
        <Link to="/settings/privacy" className="link-row">
          {t("settings.privacy")}
          <CaretRight size={20} weight="bold" aria-hidden="true" />
        </Link>
        <button type="button" className="link-row" onClick={() => setConfirming(true)}>
          <span className="danger-text">{t("settings.erase")}</span>
        </button>
      </div>
      {confirming && (
        <Sheet title={t("settings.eraseTitle")} onClose={() => setConfirming(false)}>
          <p>{t("settings.eraseText")}</p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() => {
                reset();
                useUi.setState({ activeChildId: null, openTaskId: null, switcherOpen: false });
                setConfirming(false);
                nav("/", { replace: true });
              }}
            >
              {t("settings.eraseConfirm")}
            </button>
            <button type="button" className="btn btn-block" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function Privacy() {
  const t = useT();
  return (
    <div className="flow">
      <Link to="/settings" className="back">
        <CaretLeft size={20} weight="bold" aria-hidden="true" />
        {t("settings.title")}
      </Link>
      <h1 className="t-title">{t("privacy.title")}</h1>
      <ul className="flow">
        <li>{t("privacy.1")}</li>
        <li>{t("privacy.2")}</li>
        <li>{t("privacy.3")}</li>
        <li>{t("i18n.aiNote")}</li>
      </ul>
      <details className="disc">
        <summary className="disc-sum">{t("privacy.aiTitle")}</summary>
        <div className="disc-body">
          <p>{t("privacy.aiText")}</p>
        </div>
      </details>
    </div>
  );
}
