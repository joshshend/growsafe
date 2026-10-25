// Photo option for the room check. Any failure ends in a plain line; the tap list below always works.
import { useEffect, useRef, useState } from "react";
import { takePhoto } from "../native/camera";
import { faceDetectorAvailable } from "../perception/faces";
import { HostedProvider, providerStatus, type ProviderStatus } from "../perception/hosted";
import { DetectError } from "../perception/provider";
import { PhotoError, mayScan, sampleFindings, scanPhoto } from "../perception/scan";
import { useStore } from "../store/store";
import { ScanTrace } from "./illustrations";
import { Tick } from "./parts";
import { useLang, useT } from "./useT";
import "./photo.css";

type View = "idle" | "consent" | "busy" | "review" | "applied";
type Kind = "photo" | "sample";
const SAMPLE_URL = "/demo/sample-room.svg";

export function PhotoScan({
  offered,
  mode,
  onApply,
}: {
  offered: string[];
  mode: "scan" | "recheck";
  onApply: (cues: string[]) => void;
}) {
  const t = useT();
  const lang = useLang();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const [status, setStatus] = useState<ProviderStatus | "checking">("checking");
  const [view, setView] = useState<View>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sample, setSample] = useState(false);
  const pending = useRef<Kind>("photo");
  const provider = useRef(new HostedProvider());

  useEffect(() => {
    let live = true;
    void providerStatus().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);

  // No key on the server: the photo option stays out of sight entirely.
  if (status === "checking" || status === "none") return null;
  const name = provider.current.provider ?? (status === "offline" ? null : status);

  function start(kind: Kind) {
    pending.current = kind;
    setMsg(null);
    if (!mayScan(settings)) setView("consent");
    else void run(kind);
  }

  function agree() {
    setSettings({ perceptionConsent: true });
    void run(pending.current);
  }

  function showFound(cues: string[], isSample: boolean) {
    setSample(isSample);
    setFound(cues);
    setPicked(new Set(cues));
    setView("review");
  }

  async function run(kind: Kind) {
    setView("busy");
    const isSample = kind === "sample";
    try {
      let blob: Blob | null;
      if (isSample) {
        try {
          blob = await (await fetch(SAMPLE_URL)).blob();
        } catch {
          blob = null;
        }
      } else {
        blob = await takePhoto();
        if (!blob) {
          setView("idle");
          return;
        }
      }
      if (!blob) throw new DetectError("offline");
      const findings = await scanPhoto(blob, offered, provider.current, lang);
      showFound(
        findings.map((f) => f.cue),
        false,
      );
    } catch (e) {
      if (isSample) {
        // The sample must never dead-end: fall back to a canned, clearly labelled result.
        showFound(
          sampleFindings(offered).map((f) => f.cue),
          true,
        );
      } else if (e instanceof PhotoError) {
        setMsg(t(`photo.issue.${e.issue}`));
        setView("idle");
      } else {
        const code = e instanceof DetectError ? e.code : "provider_error";
        setMsg(t(`photo.fail.${code}`));
        setView("idle");
      }
    }
  }

  const toggle = (cue: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(cue)) next.delete(cue);
      else next.add(cue);
      return next;
    });

  if (view === "consent") {
    const body = name ? `photo.consent.${name}` : "photo.consent.generic";
    return (
      <section className="photo" aria-labelledby="photo-consent">
        <h2 id="photo-consent" className="d3">
          {t("photo.consent.title")}
        </h2>
        <p>{t(body)}</p>
        <div className="photo-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={agree}>
            {t("photo.consent.agree")}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setView("idle")}
          >
            {t("photo.consent.decline")}
          </button>
        </div>
      </section>
    );
  }

  if (view === "busy") {
    return (
      <section className="photo" aria-live="polite">
        <p className="photo-msg">{t("photo.busy")}</p>
      </section>
    );
  }

  if (view === "review" || view === "applied") {
    return (
      <section className="photo" aria-labelledby="photo-review">
        {sample && <span className="photo-badge">{t("photo.sampleLabel")}</span>}
        <h2 id="photo-review" className="d3">
          {t("photo.review.title")}
        </h2>
        {(sample || found.length === 0) && (
          <figure className="photo-figure">
            <div className="photo-frame">
              <ScanTrace decorative />
            </div>
          </figure>
        )}
        {found.length === 0 ? (
          <p className="photo-msg">{t("photo.review.none")}</p>
        ) : view === "review" ? (
          <>
            <p className="t2">{t("photo.review.hint")}</p>
            <ul className="rows">
              {found.map((cue) => (
                <li key={cue} className="row">
                  <button
                    type="button"
                    className="photo-chip"
                    aria-pressed={picked.has(cue)}
                    onClick={() => toggle(cue)}
                  >
                    <span className="check-mark" aria-hidden="true">
                      <Tick />
                    </span>
                    <span className="row-title">{t(`cue.${cue}`)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {sample && <p className="fine">{t("photo.sampleNote")}</p>}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                onApply([...picked]);
                setView("applied");
              }}
            >
              {t("photo.review.use")}
            </button>
          </>
        ) : (
          <p className="photo-msg">{t("photo.applied")}</p>
        )}
        <div className="photo-actions">
          {!sample && (
            <button type="button" className="btn btn-quiet" onClick={() => start("photo")}>
              {t("photo.retake")}
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={() => setView("idle")}>
            {t("photo.useTapList")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="photo" aria-label={t("photo.scan")}>
      <div className="photo-figure photo-figure-small">
        <ScanTrace decorative />
      </div>
      <p className="t2 muted">
        {faceDetectorAvailable() ? t("photo.hint") : `${t("photo.hint")} ${t("photo.noFaceApi")}`}
      </p>
      {msg && (
        <p className="photo-msg" role="status">
          {msg}
        </p>
      )}
      <div className="photo-actions">
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => start("photo")}
        >
          {t(mode === "recheck" ? "photo.recheck" : "photo.scan")}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => start("sample")}>
          {t("photo.sample")}
        </button>
      </div>
    </section>
  );
}
