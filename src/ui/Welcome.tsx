import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { Wordmark } from "./Logo";
import { EmptyDoorframe } from "./illustrations";
import { useT } from "./useT";

export function Welcome() {
  const t = useT();
  const loadDemo = useStore((s) => s.loadDemo);
  return (
    <div className="welcome">
      <div className="welcome-art">
        <EmptyDoorframe decorative />
      </div>
      <div className="flow-s">
        <Wordmark text={t("app.title")} as="h1" large />
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
