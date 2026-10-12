// Helper view (T22). Opened from a visit-pack link, with or without any GrowSafe data on this
// phone. The helper ticks items, then sends a tiny reply link back. Nothing is uploaded.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PaperPlaneTilt, Printer, TextAa } from "@phosphor-icons/react";
import { loadKb } from "../kb";
import { ReplySchema, decodeVisitPack, replyUrl } from "../share/visit";
import {
  changedCount,
  helperReply,
  progress,
  restoreHelper,
  setBy,
  tick,
  type HelperState,
} from "../visit/state";
import { appBase, shareLink, type ShareResult } from "../visit/share";
import { helperKey, loadKey, saveKey } from "../visit/storage";
import { useStore } from "../store/store";
import { useEasy, useEasyStore } from "./easy";
import { localHazard } from "./format";
import { useLang, useT } from "./useT";
import "./visit.css";

export function Visit() {
  const t = useT();
  const lang = useLang();
  const easy = useEasy();
  const setEasy = useEasyStore((s) => s.setEasy);
  const { search } = useLocation();
  const homes = useStore((s) => s.homes);
  const kb = useMemo(() => loadKb(), []);

  const parsed = useMemo(() => {
    try {
      return { pack: decodeVisitPack(search), error: false };
    } catch {
      return { pack: null, error: true };
    }
  }, [search]);
  const pack = parsed.pack;

  const [state, setState] = useState<HelperState | null>(null);
  const [result, setResult] = useState<ShareResult | null>(null);
  const [link, setLink] = useState("");
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (!pack) return;
    let live = true;
    void loadKey(helperKey(pack.packId)).then((saved) => {
      if (live) setState(restoreHelper(pack, saved));
    });
    return () => {
      live = false;
    };
  }, [pack]);

  if (!pack) {
    return (
      <div className="flow">
        <h1 className="t-title">{t("visit.badTitle")}</h1>
        <p role="alert">{t("visit.bad")}</p>
        <Link to="/" className="btn btn-block">
          {t("common.goHome")}
        </Link>
      </div>
    );
  }
  if (!state) {
    return (
      <p className="loading" role="status">
        {t("common.loading")}
      </p>
    );
  }

  const update = (next: HelperState) => {
    setState(next);
    setResult(null);
    void saveKey(helperKey(next.pack.packId), next);
  };
  const { done, total } = progress(state);
  const changed = changedCount(state);
  const localHome = homes.find((h) => h.name === pack.homeName);

  const title = (hazardId: string) => {
    const h = kb.find((x) => x.id === hazardId);
    return h ? localHazard(h, lang).name : hazardId;
  };

  async function sendBack() {
    if (!state) return;
    if (!ReplySchema.shape.by.safeParse(state.by.trim()).success) {
      setNameError(true);
      return;
    }
    setNameError(false);
    const reply = helperReply({ ...state, by: state.by.trim() });
    const url = replyUrl(appBase(), reply);
    setLink(url);
    setResult(
      await shareLink(url, {
        title: t("visit.shareTitle"),
        text: t("visit.replyText", { by: reply.by, home: pack!.homeName }),
      }),
    );
  }

  return (
    <div className="flow visit">
      <h1 className="t-title">{t("visit.title", { from: pack.from, home: pack.homeName })}</h1>
      <p>{t("visit.intro", { stage: t(`stage.${pack.ageBand}`) })}</p>
      <p className="muted">{t("visit.private")}</p>

      {!easy && (
        <button type="button" className="btn btn-block no-print" onClick={() => setEasy(true)}>
          <TextAa size={22} weight="duotone" aria-hidden="true" />
          {t("visit.easyOffer")}
        </button>
      )}

      <p role="status" className="t-strong">
        {t("visit.progress", { done, total })}
      </p>
      <ul className="rows visit-list">
        {state.tasks.map((task) => {
          const meta = pack.tasks.find((p) => p.id === task.id);
          if (!meta) return null;
          return (
            <li
              key={task.id}
              className={`row visit-row${task.status === "done" ? " is-done" : ""}`}
            >
              <label className="visit-label">
                <input
                  type="checkbox"
                  className="visit-box"
                  checked={task.status === "done"}
                  onChange={(e) => update(tick(state, task.id, e.target.checked, Date.now()))}
                />
                <span className="row-body">
                  <span className="row-title">{title(meta.hazardId)}</span>
                  <span className="row-sub">{t(`room.${meta.room}`)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="field no-print">
        <label className="field-label" htmlFor="visit-by">
          {t("visit.yourName")}
        </label>
        <input
          id="visit-by"
          className="input"
          autoComplete="given-name"
          value={state.by}
          aria-invalid={nameError}
          aria-describedby="visit-by-hint"
          onChange={(e) => update(setBy(state, e.target.value))}
        />
        <p id="visit-by-hint" className="field-hint">
          {t("visit.yourNameHint")}
        </p>
        {nameError && (
          <p role="alert" className="input-error">
            {t("visit.nameError")}
          </p>
        )}
      </div>

      <div className="form-actions no-print">
        <button
          type="button"
          className="btn btn-primary btn-block visit-send"
          disabled={changed === 0}
          onClick={() => void sendBack()}
        >
          <PaperPlaneTilt size={26} weight="duotone" aria-hidden="true" />
          {t("visit.send")}
        </button>
        {changed === 0 && <p className="muted">{t("visit.sendHint")}</p>}
        <p role="status" className="muted">
          {result === "shared" && t("visit.sent")}
          {result === "copied" && t("visit.copied")}
          {result === "manual" && t("visit.manual")}
        </p>
        {result === "manual" && (
          <input
            className="input"
            readOnly
            aria-label={t("visit.linkLabel")}
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
        <button type="button" className="btn btn-block" onClick={() => window.print()}>
          <Printer size={22} weight="duotone" aria-hidden="true" />
          {t("visit.print")}
        </button>
        {localHome && (
          <Link to={`/briefing/${localHome.id}`} className="btn btn-block">
            {t("visit.briefing")}
          </Link>
        )}
      </div>
      <p className="fine">{t("task.notGuarantee")}</p>
    </div>
  );
}
