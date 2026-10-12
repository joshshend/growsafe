// One row at the top of Today when any gear has a possible recall match, plus the once-a-day re-check.
import { useEffect } from "react";
import { CaretRight, WarningDiamond } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { useT } from "../ui/useT";
import { shouldRecheck } from "./cpscClient";
import { activeMatches } from "./types";
import { useRecallCheck } from "./useRecallCheck";
import "./gear.css";

const tried = new Set<string>(); // gear ids already re-checked in this app session

export function RecallBanner() {
  const t = useT();
  const gear = useStore((s) => s.gear);
  const hydrated = useStore((s) => s.hydrated);
  const check = useRecallCheck();

  // On app open: re-check each item at most once a day. Offline just keeps the saved result.
  useEffect(() => {
    if (!hydrated) return;
    const now = new Date();
    const due = gear.filter((g) => !tried.has(g.id) && shouldRecheck(g.lastChecked, now));
    due.forEach((g) => tried.add(g.id));
    void (async () => {
      for (const g of due) await check(g.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, gear.length]);

  const flagged = gear.filter((g) => activeMatches(g).length > 0);
  const first = flagged[0];
  if (!first) return null;
  const name = t("gear.name", { brand: first.brand, type: t(`gear.type.${first.type}`) });
  return (
    <Link to={`/rooms?gear=${first.id}`} className="wk-card gear-banner">
      <span className="wk-card-icon">
        <WarningDiamond size={32} weight="duotone" aria-hidden="true" />
      </span>
      <span className="row-body">
        <span className="row-title">
          {flagged.length > 1
            ? t("gear.bannerMore", { name, n: flagged.length - 1 })
            : t("gear.banner", { name })}
        </span>
        <span className="row-sub">{t("gear.possibleMatch")}</span>
      </span>
      <CaretRight size={20} weight="bold" aria-hidden="true" />
    </Link>
  );
}
