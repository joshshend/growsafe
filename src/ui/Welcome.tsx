import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { HazardIcon } from "./icons";
import { useT } from "./useT";

export function Welcome() {
  const t = useT();
  const loadDemo = useStore((s) => s.loadDemo);
  return (
    <div className="welcome">
      <div className="welcome-icons" aria-hidden="true">
        <HazardIcon name="tv" size={44} />
        <HazardIcon name="stairs" size={44} />
        <HazardIcon name="pot" size={44} />
        <HazardIcon name="pill" size={44} />
        <HazardIcon name="plug" size={44} />
        <HazardIcon name="bath" size={44} />
      </div>
      <div className="flow-s">
        <h1 className="wordmark">{t("app.title")}</h1>
        <p>{t("welcome.lead")}</p>
      </div>
      <div className="form-actions">
        <Link to="/start" className="btn btn-primary btn-block">
          {t("welcome.start")}
        </Link>
        <button type="button" className="btn btn-text btn-block" onClick={loadDemo}>
          {t("welcome.demo")}
        </button>
      </div>
    </div>
  );
}
