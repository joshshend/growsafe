import { Phone } from "@phosphor-icons/react";
import { useT } from "./useT";

export function Help() {
  const t = useT();
  return (
    <div className="flow">
      <h1 className="t-title">{t("help.title")}</h1>
      <div className="flow-s">
        <a className="poison-big" href="tel:+18002221222" aria-label={t("poison.label")}>
          <Phone size={32} weight="fill" aria-hidden="true" />
          <span aria-hidden="true">{t("poison.number")}</span>
        </a>
        <p>{t("help.poisonText")}</p>
        <p className="muted">{t("help.call911")}</p>
      </div>
      <section className="flow-s" aria-labelledby="help-gear">
        <h2 id="help-gear" className="t-section">
          {t("help.gearTitle")}
        </h2>
        <p className="muted">{t("help.soon")}</p>
      </section>
      <section className="flow-s" aria-labelledby="help-care">
        <h2 id="help-care" className="t-section">
          {t("help.careTitle")}
        </h2>
        <p className="muted">{t("help.soon")}</p>
      </section>
      <p className="fine">{t("task.notGuarantee")}</p>
    </div>
  );
}
