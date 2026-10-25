// Room check (T9-lite): tick what you see in a room; the knowledge base turns it into tasks. No AI involved.
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { loadKb } from "../kb";
import type { Room, Task } from "../kb/schema";
import { cuesForRoom, findingsFromTaps, verifyFix } from "../perception";
import { useStore } from "../store/store";
import { isChecked, prefillCues } from "../plan/roomCheck";
import { localHazard } from "./format";
import { ActionBar, CueList } from "./CueList";
import { PhotoScan } from "./PhotoScan";
import { BackLink, useChildViews, useSetDone } from "./parts";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";
import "./scan.css";

const LIMIT = 12;

export function Scan() {
  const t = useT();
  const [params] = useSearchParams();
  const homes = useStore((s) => s.homes);
  const child = useActiveChild();
  if (!child) return <Navigate to="/" replace />;
  if (homes.length === 0) {
    return (
      <div className="flow">
        <p className="muted">{t("scan.noHome")}</p>
        <Link to="/home/new" className="btn btn-primary btn-block">
          {t("plan.addHome")}
        </Link>
      </div>
    );
  }
  const home = homes.find((h) => h.id === params.get("home")) ?? homes[0]!;
  const asked = params.get("room");
  const room = (home.rooms.find((r) => r === asked) ?? home.rooms[0]) as Room | undefined;
  if (!room) return <Navigate to="/rooms" replace />;
  // Remount when the home, room or re-check target changes so ticks start fresh.
  const key = `${home.id}|${room}|${params.get("task") ?? ""}`;
  return <ScanBody key={key} homeId={home.id} room={room} taskId={params.get("task")} />;
}

function ScanBody({ homeId, room, taskId }: { homeId: string; room: Room; taskId: string | null }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const child = useActiveChild()!;
  const home = useStore((s) => s.homes.find((h) => h.id === homeId))!;
  const homes = useStore((s) => s.homes);
  const tasks = useStore((s) => s.tasks);
  const checkRoom = useStore((s) => s.checkRoom);
  const setStatus = useStore((s) => s.setStatus);
  const showToast = useUi((s) => s.showToast);
  const setDone = useSetDone();
  const kb = useMemo(() => loadKb(), []);
  const views = useChildViews();

  const recheck = taskId ? tasks.find((x) => x.id === taskId) : undefined;
  const all = useMemo(() => cuesForRoom(kb, room, child, new Date()), [kb, room, child]);
  const cues = useMemo(() => {
    if (!recheck) return all;
    const h = kb.find((x) => x.id === recheck.hazard_id);
    return all.filter((c) => h?.detection_cues.includes(c.cue));
  }, [all, kb, recheck]);

  // Re-opening a checked room starts from what was ticked before, so saving only changes what you change.
  const [ticked, setTicked] = useState<Set<string>>(
    () =>
      new Set(
        recheck
          ? cues.map((c) => c.cue)
          : prefillCues(
              kb,
              home,
              room,
              tasks,
              all.map((c) => c.cue),
            ),
      ),
  );
  const [showAll, setShowAll] = useState(false);
  const [result, setResult] = useState<{
    added: Task[];
    fresh: number;
    removed: number;
    blind: string[];
  } | null>(null);

  const hazardName = (id: string) => {
    const h = kb.find((x) => x.id === id);
    return h ? localHazard(h, lang).name : id;
  };
  const toggle = (cue: string) =>
    setTicked((cur) => {
      const next = new Set(cur);
      if (next.has(cue)) next.delete(cue);
      else next.add(cue);
      return next;
    });

  function finishAdd() {
    const scoped = kb.filter((h) => all.some((c) => c.hazardIds.includes(h.id)));
    // Saves the check: tasks for what is ticked, and untouched to-do tasks for what was unticked go.
    const res = checkRoom(home.id, room, [...ticked], child.id);
    if (!res) return;
    const made = res.added;
    const fresh = res.fresh;
    const hazards = made.length
      ? made.map((m) => kb.find((h) => h.id === m.hazard_id)!)
      : scoped.filter((h) => h.rooms.includes(room));
    const blind = [...new Set(hazards.flatMap((h) => h.blind_spots))];
    setResult({ added: made, fresh, removed: res.removed, blind });
  }

  function finishRecheck() {
    if (!recheck) return;
    const verdict = verifyFix(
      recheck,
      findingsFromTaps([...ticked]),
      kb,
      cues.map((c) => c.cue),
    );
    if (verdict === "fixed") {
      if (recheck.status !== "done") setDone(recheck.id, true);
      else showToast({ message: t("scan.recheck.fixed") });
    } else {
      if (verdict === "still_present" && recheck.status === "done") setStatus(recheck.id, "todo");
      showToast({ message: t("scan.recheck.still") });
    }
    navigate(`/room/${home.id}/${room}`);
  }

  if (result) {
    const label = t(`room.${room}`);
    const rows = views.filter((v) => result.added.some((a) => a.id === v.task.id));
    const existing = result.added.length - result.fresh;
    return (
      <div className="flow">
        <h1 className="d4">
          {result.fresh === 0
            ? t("scan.result.zero")
            : t(result.fresh === 1 ? "scan.result.one" : "scan.result.other", { n: result.fresh })}
        </h1>
        {existing > 0 && <p className="muted">{t("scan.result.existing", { n: existing })}</p>}
        {result.removed > 0 && <p className="muted">{t("rooms.removed", { n: result.removed })}</p>}
        {rows.length > 0 && (
          <section aria-labelledby="scan-tasks">
            <h2 id="scan-tasks" className="lbl">
              {t("scan.result.tasks")}
            </h2>
            <ul className="rows">
              {rows.map((v) => (
                <li key={v.task.id} className="row">
                  <Link to={`/task/${v.task.id}`} className="row-link">
                    <span className="row-body">
                      <span className="row-title">{localHazard(v.hazard, lang).name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.blind.length > 0 && (
          <section aria-labelledby="scan-blind" className="flow-s">
            <h2 id="scan-blind" className="lbl">
              {t("scan.blind.title")}
            </h2>
            <ul className="bullets">
              {result.blind.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        )}
        <p className="scan-note">{t("scan.disclaimer")}</p>
        <Link to={`/room/${home.id}/${room}`} className="btn btn-primary btn-block">
          {t("scan.result.viewRoom", { room: label })}
        </Link>
      </div>
    );
  }

  const visible = showAll || recheck ? cues : cues.slice(0, LIMIT);
  const n = ticked.size;

  return (
    <div className="flow">
      <BackLink to={`/room/${home.id}/${room}`}>{t(`room.${room}`)}</BackLink>
      <div className="flow-s">
        <h1 className="d4">{t(recheck ? "scan.recheck.title" : "scan.title")}</h1>
        <p className="t2 muted">{t(recheck ? "scan.recheck.intro" : "scan.intro")}</p>
      </div>

      {cues.length > 0 && (
        <PhotoScan
          offered={cues.map((c) => c.cue)}
          mode={recheck ? "recheck" : "scan"}
          onApply={(sel) =>
            setTicked((cur) => (recheck ? new Set(sel) : new Set([...cur, ...sel])))
          }
        />
      )}

      {!recheck && (
        <div className="scan-pick">
          {homes.length > 1 && (
            <div className="field">
              <label className="field-label" htmlFor="scan-home">
                {t("scan.home")}
              </label>
              <select
                id="scan-home"
                className="input"
                value={home.id}
                onChange={(e) => {
                  const h = homes.find((x) => x.id === e.target.value);
                  navigate(`/scan?home=${e.target.value}&room=${h?.rooms[0] ?? ""}`, {
                    replace: true,
                  });
                }}
              >
                {homes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="scan-room">
              {t("scan.room")}
            </label>
            <select
              id="scan-room"
              className="input"
              value={room}
              onChange={(e) =>
                navigate(`/scan?home=${home.id}&room=${e.target.value}`, { replace: true })
              }
            >
              {home.rooms.map((r) => (
                <option key={r} value={r}>
                  {t(`room.${r}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {cues.length === 0 ? (
        <p className="muted">{t("scan.none", { name: child.nickname })}</p>
      ) : (
        <div className="flow-s">
          <CueList
            cues={visible}
            ticked={ticked}
            onToggle={toggle}
            groupName={hazardName}
            label={t("scan.listLabel")}
          />
          {!recheck && cues.length > LIMIT && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setShowAll(!showAll)}
            >
              {t(showAll ? "scan.showLess" : "scan.showMore")}
            </button>
          )}
        </div>
      )}

      {!recheck && n === 0 && cues.length > 0 && <p className="fine">{t("scan.noneTicked")}</p>}
      <p className="scan-note">{t("scan.disclaimer")}</p>
      <ActionBar>
        {recheck ? (
          <button type="button" className="btn btn-primary btn-block" onClick={finishRecheck}>
            {t("scan.recheck.update")}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={finishAdd}>
            {n === 0
              ? t(isChecked(home, room) ? "scan.finish" : "rooms.nothingNeeds")
              : t(n === 1 ? "scan.addN.one" : "scan.addN.other", { n })}
          </button>
        )}
      </ActionBar>
    </div>
  );
}
