// Per-home medicine and chemical storage check (T6). Items are the KB fix steps; answers update tasks.
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AUDIT_HAZARDS,
  auditChanges,
  auditItems,
  auditProgress,
  type Answer,
} from "../emergency/audit";
import { useEmergency } from "../emergency/store";
import { loadKb } from "../kb";
import { useStore } from "../store/store";
import { localHazard } from "./format";
import { useUi } from "./ui-state";
import { useLang, useT } from "./useT";
import "./emergency.css";

const ANSWERS: Answer[] = ["yes", "no", "na"];

export function MedicineCheck() {
  const t = useT();
  const lang = useLang();
  const { homeId = "" } = useParams();
  const home = useStore((s) => s.homes.find((h) => h.id === homeId));
  const tasks = useStore((s) => s.tasks);
  const setStatus = useStore((s) => s.setStatus);
  const hydrate = useEmergency((s) => s.hydrate);
  const hydrated = useEmergency((s) => s.hydrated);
  const answers = useEmergency((s) => s.audits[homeId]) ?? {};
  const setAnswer = useEmergency((s) => s.setAnswer);
  const showToast = useUi((s) => s.showToast);
  const kb = useMemo(() => loadKb(), []);
  const items = useMemo(() => auditItems(kb), [kb]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!home) {
    return (
      <div className="flow">
        <p role="alert">{t("med.notFound")}</p>
        <Link className="btn btn-block" to="/people">
          {t("med.back")}
        </Link>
      </div>
    );
  }

  function answer(itemId: string, value: Answer) {
    const next = { ...answers };
    if (next[itemId] === value) delete next[itemId];
    else next[itemId] = value;
    setAnswer(homeId, itemId, next[itemId] ?? null);
    const changes = auditChanges(tasks, homeId, items, next);
    for (const c of changes) setStatus(c.taskId, c.status);
    if (changes.length) showToast({ message: t("med.updated") });
  }

  const prog = auditProgress(items, answers);
  return (
    <div className="flow">
      <h1 className="t-title">{t("med.title", { home: home.name })}</h1>
      <p>{t("med.intro")}</p>
      <p role="status" className="t-strong">
        {t("med.progress", { answered: prog.answered, total: prog.total })}
      </p>
      {hydrated &&
        AUDIT_HAZARDS.map((hid) => {
          const hazard = kb.find((h) => h.id === hid);
          if (!hazard) return null;
          const steps = localHazard(hazard, lang).steps;
          const sorted = [...hazard.fix_steps].sort((a, b) => a.order - b.order);
          const hasTask = tasks.some((x) => x.home_id === homeId && x.hazard_id === hid);
          return (
            <section key={hid} className="flow-s" aria-labelledby={`g-${hid}`}>
              <h2 id={`g-${hid}`} className="t-section section-head">
                {t(`med.group.${hid}`)}
              </h2>
              {!hasTask && <p className="muted">{t("med.noTasks")}</p>}
              {sorted.map((s, i) => {
                const id = `${hid}:${s.order}`;
                const text = steps[i] ?? s.text;
                return (
                  <div
                    key={id}
                    className="audit-item"
                    role="group"
                    aria-label={t("med.question", { step: text })}
                  >
                    <p>{text}</p>
                    <div className="seg">
                      {ANSWERS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          className="seg-btn"
                          aria-pressed={answers[id] === a}
                          onClick={() => answer(id, a)}
                        >
                          {t(`med.${a}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      <p className="fine">{t("task.notGuarantee")}</p>
      <Link to="/people" className="btn btn-text btn-block">
        {t("med.back")}
      </Link>
    </div>
  );
}
