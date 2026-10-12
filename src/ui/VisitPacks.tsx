// People tab section (T22): send a visit pack for a home, and see packs still waiting for a reply.
import { useEffect, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import type { Home } from "../kb/schema";
import { ReplySchema, buildVisitPack, visitPackUrl } from "../share/visit";
import { newId, useStore } from "../store/store";
import { sentRecord } from "../visit/state";
import { appBase, shareLink, type ShareResult } from "../visit/share";
import { useSent } from "../visit/storage";
import { Sheet } from "./Sheet";
import { useT } from "./useT";

const NAME_KEY = "growsafe:visit-from";
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

function SendSheet({ home, onClose }: { home: Home; onClose: () => void }) {
  const t = useT();
  const children = useStore((s) => s.children);
  const tasks = useStore((s) => s.tasks);
  const add = useSent((s) => s.add);
  const [from, setFrom] = useState(readName);
  const [helper, setHelper] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShareResult | null>(null);
  const [link, setLink] = useState("");

  async function send() {
    if (!ReplySchema.shape.by.safeParse(from.trim()).success) {
      setError(t("visit.fromError"));
      return;
    }
    let url: string;
    let record;
    try {
      const pack = buildVisitPack({ children, homes: [home], tasks }, home.id, {
        from: from.trim(),
        packId: newId("p"),
      });
      url = visitPackUrl(appBase(), pack);
      record = sentRecord(pack, home.id, helper, Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("visit.packError"));
      return;
    }
    setError("");
    try {
      localStorage.setItem(NAME_KEY, from.trim());
    } catch {
      /* ignore */
    }
    setLink(url);
    const r = await shareLink(url, {
      title: t("visit.shareTitle"),
      text: t("visit.packText", { from: from.trim(), home: home.name }),
    });
    setResult(r);
    if (r !== "cancelled") add(record);
  }

  return (
    <Sheet title={t("visit.sendTitle", { home: home.name })} onClose={onClose}>
      <p className="muted">{t("visit.sendIntro")}</p>
      <div className="field">
        <label className="field-label" htmlFor="vp-from">
          {t("visit.fromLabel")}
        </label>
        <input
          id="vp-from"
          className="input"
          autoComplete="given-name"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <p className="field-hint">{t("visit.fromHint")}</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="vp-helper">
          {t("visit.helperLabel")}
        </label>
        <input
          id="vp-helper"
          className="input"
          value={helper}
          maxLength={40}
          onChange={(e) => setHelper(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="input-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={() => void send()}>
          <PaperPlaneTilt size={22} weight="duotone" aria-hidden="true" />
          {t("visit.sendLink")}
        </button>
        <p role="status" className="muted">
          {result === "shared" && t("visit.packShared")}
          {result === "copied" && t("visit.packCopied")}
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
      </div>
    </Sheet>
  );
}

export function VisitPacks() {
  const t = useT();
  const homes = useStore((s) => s.homes);
  const sent = useSent((s) => s.sent);
  const loaded = useSent((s) => s.loaded);
  const load = useSent((s) => s.load);
  const remove = useSent((s) => s.remove);
  const [sending, setSending] = useState<Home | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const pending = sent.filter((p) => !p.mergedAt);
  if (homes.length === 0) return null;
  return (
    <section aria-labelledby="pv">
      <h2 id="pv" className="t-section section-head">
        {t("visit.section")}
      </h2>
      <p className="muted">{t("visit.sectionHint")}</p>
      <ul className="rows">
        {homes.map((h) => (
          <li key={h.id} className="row">
            <button type="button" className="btn btn-block" onClick={() => setSending(h)}>
              <PaperPlaneTilt size={22} weight="duotone" aria-hidden="true" />
              {t("visit.sendFor", { home: h.name })}
            </button>
          </li>
        ))}
      </ul>
      {pending.length > 0 && (
        <>
          <h3 className="t-strong">{t("visit.pending")}</h3>
          <ul className="rows">
            {pending.map((p) => (
              <li key={p.packId} className="row">
                <div className="row-body">
                  <span className="row-title">
                    {p.helper
                      ? t("visit.waitingFor", { helper: p.helper, home: p.homeName })
                      : t("visit.waiting", { home: p.homeName })}
                  </span>
                  <span className="row-sub">
                    {t("visit.sentOn", { date: new Date(p.sentAt).toLocaleDateString() })}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-text"
                  aria-label={t("visit.forgetLabel", { home: p.homeName })}
                  onClick={() => remove(p.packId)}
                >
                  {t("visit.forget")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {sending && <SendSheet home={sending} onClose={() => setSending(null)} />}
    </section>
  );
}
