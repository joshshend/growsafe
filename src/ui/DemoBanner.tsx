// Shown on Today and Rooms while the example family is loaded. Dismiss lasts for the session only.
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { useUi } from "./ui-state";
import { useT } from "./useT";

export function DemoBanner() {
  const t = useT();
  const navigate = useNavigate();
  const isDemo = useStore((s) => s.children.some((c) => c.id.startsWith("demo-")));
  const dismissed = useUi((s) => s.demoBannerDismissed);
  const dismiss = useUi((s) => s.dismissDemoBanner);
  const reset = useStore((s) => s.reset);
  if (!isDemo || dismissed) return null;
  return (
    <div className="demo-banner" role="region" aria-label={t("demo.banner")}>
      <p className="t1">{t("demo.banner")}</p>
      <div className="demo-banner-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            reset();
            navigate("/start");
          }}
        >
          {t("demo.startOwn")}
        </button>
        <button type="button" className="btn btn-quiet" onClick={dismiss}>
          {t("demo.dismiss")}
        </button>
      </div>
    </div>
  );
}
