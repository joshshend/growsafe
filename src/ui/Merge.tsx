// Parent view (T22). Opened from a reply link: says in plain words what changed, and only changes
// the plan after the parent taps Confirm.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { loadKb } from "../kb";
import { decodeReply } from "../share/visit";
import { previewMerge } from "../visit/state";
import { useSent } from "../visit/storage";
import { useStore } from "../store/store";
import { localHazard } from "./format";
import { useLang, useT } from "./useT";
import "./visit.css";

export function Merge() {
  const t = useT();
  const lang = useLang();
  const { search } = useLocation();
  const tasks = useStore((s) => s.tasks);
  const setStatus = useStore((s) => s.setStatus);
  const sentList = useSent((s) => s.sent);
  const loaded = useSent((s) => s.loaded);
  const load = useSent((s) => s.load);
  const markMerged = useSent((s) => s.markMerged);
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const kb = useMemo(() => loadKb(), []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const reply = useMemo(() => {
    try {
      return decodeReply(search);
    } catch {
      return null;
    }
  }, [search]);

  if (!reply) {
    return (
      <div className="flow">
        <h1 className="t-title">{t("merge.badTitle")}</h1>
        <p role="alert">{t("merge.bad")}</p>
        <Link to="/" className="btn btn-block">
          {t("common.goHome")}
        </Link>
      </div>
    );
  }
  if (!loaded) {
    return (
      <p className="loading" role="status">
        {t("common.loading")}
      </p>
    );
  }

  const sent = sentList.find((p) => p.packId === reply.packId);
  const preview = previewMerge(tasks, sent, reply, Date.now());
  const { changes, finished, summary } = preview;
  const name = (id: string) => {
    const task = tasks.find((x) => x.id === id);
    const h = task && kb.find((x) => x.id === task.hazard_id);
    return h ? localHazard(h, lang).name : id;
  };

  if (confirmed !== null) {
    return (
      <div className="flow">
        <h1 className="t-title">{t("merge.doneTitle")}</h1>
        <p role="status">
          {confirmed === 1 ? t("merge.updated.one") : t("merge.updated", { n: confirmed })}
        </p>
        <Link to="/" className="btn btn-primary btn-block">
          {t("merge.toPlan")}
        </Link>
      </div>
    );
  }

  const headline =
    finished === 0
      ? t("merge.nothing", { by: summary.by })
      : finished === 1
        ? t("merge.finished.one", { by: summary.by })
        : t("merge.finished", { by: summary.by, n: finished });

  return (
    <div className="flow">
      <h1 className="t-title">{headline}</h1>
      {sent && <p className="muted">{t("merge.forHome", { home: sent.homeName })}</p>}
      {!sent && <p className="muted">{t("merge.unknownPack")}</p>}
      {changes.length > 0 && (
        <ul className="rows">
          {changes.map((c) => (
            <li key={c.id} className="row">
              <div className="row-body">
                <span className="row-title">{name(c.id)}</span>
                <span className="row-sub">{t(`merge.status.${c.status}`)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">{t("merge.private")}</p>
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={changes.length === 0}
          onClick={() => {
            for (const c of changes) setStatus(c.id, c.status);
            if (sent) markMerged(sent.packId, Date.now());
            setConfirmed(changes.length);
          }}
        >
          {t("merge.confirm")}
        </button>
        <Link to="/" className="btn btn-block">
          {t("merge.notNow")}
        </Link>
      </div>
    </div>
  );
}
