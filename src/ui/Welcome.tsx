import { Link, Navigate } from "react-router-dom";
import { useStore } from "../store/store";
import { useT } from "./useT";

export function Welcome() {
  const t = useT();
  const hasChild = useStore((s) => s.children.length > 0);
  const hasHome = useStore((s) => s.homes.length > 0);
  const loadDemo = useStore((s) => s.loadDemo);
  if (hasChild && hasHome) return <Navigate to="/plan" replace />;
  return (
    <div className="stack">
      <div className="hero">
        <div className="hero-mark" aria-hidden="true">
          🧸
        </div>
        <h1>{t("welcome.title")}</h1>
        <p className="lead">{t("welcome.lead")}</p>
      </div>
      <div className="card demo">
        <button type="button" className="btn primary big" onClick={loadDemo}>
          {t("welcome.demo")}
        </button>
        <p className="muted">{t("welcome.demoHint")}</p>
      </div>
      <h2 className="divider">{t("welcome.or")}</h2>
      <ul className="steps-list">
        <li>
          <Link to="/child/new" className="step-card">
            <span className={`step-num${hasChild ? " ok" : ""}`} aria-hidden="true">
              {hasChild ? "✓" : "1"}
            </span>
            <span>
              <strong>{t("welcome.step1")}</strong>
              <span className="muted block">
                {hasChild ? t("welcome.stepDone") : t("welcome.step1Hint")}
              </span>
            </span>
          </Link>
        </li>
        <li>
          <Link to="/home/new" className="step-card">
            <span className={`step-num${hasHome ? " ok" : ""}`} aria-hidden="true">
              {hasHome ? "✓" : "2"}
            </span>
            <span>
              <strong>{t("welcome.step2")}</strong>
              <span className="muted block">
                {hasHome ? t("welcome.stepDone") : t("welcome.step2Hint")}
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
