import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { EmptyDoorframe } from "./illustrations";
import { useT } from "./useT";

export function Welcome() {
  const t = useT();
  const loadDemo = useStore((s) => s.loadDemo);
  return (
    <div className="welcome">
      <div className="welcome-main">
        <div className="welcome-art">
          <EmptyDoorframe decorative />
        </div>
        <div className="flow-s welcome-copy">
          <h1 className="d4">{t("welcome.title")}</h1>
          <p className="t2 muted">{t("welcome.lead")}</p>
        </div>
      </div>
      <div className="form-actions">
        <Link to="/start" className="btn btn-primary btn-block">
          {t("welcome.start")}
        </Link>
        <button type="button" className="btn btn-quiet btn-block" onClick={loadDemo}>
          {t("welcome.demo")}
        </button>
        <p className="t1 muted welcome-free">{t("welcome.demoHelp")}</p>
        <p className="t1 muted welcome-free">{t("welcome.free")}</p>
      </div>
    </div>
  );
}
