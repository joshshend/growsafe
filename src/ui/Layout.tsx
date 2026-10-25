import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { GearSix, Siren } from "@phosphor-icons/react";
import { useStore } from "../store/store";
import { ChildChip } from "./ChildChip";
import { ChildSwitcher } from "./ChildSwitcher";
import { TaskSheet } from "./TaskSheet";
import { IllustrationDefs } from "./illustrations";
import { Wordmark } from "./Logo";
import { RoomDone } from "./RoomDone";
import { useApplyEasy, useEasy } from "./easy";
import { applyTheme, readTheme } from "./theme";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";

function Toaster() {
  const t = useT();
  const toast = useUi((s) => s.toast);
  const showToast = useUi((s) => s.showToast);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => showToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [toast, showToast]);
  return (
    <div role="status" aria-live="polite">
      {toast && (
        <div className="toast">
          <svg viewBox="0 0 22 22" aria-hidden="true">
            <path d="M4 11.5l5 5L18.5 5" />
          </svg>
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              className="toast-undo"
              onClick={() => {
                toast.undo?.();
                showToast(null);
              }}
            >
              {t("common.undo")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Tab icons from docs/design/Today.dc.html: plain pencil strokes, no fills.
const TAB_ICONS = {
  today: "M6 3v18M6 8h9M6 13h12M6 18h7",
  rooms: "M6 21V4h12v17M3 21h18M14.5 13v.01",
  help: "M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17v.01",
  people: "M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6M17 14c2.6 0 4.5 1.9 4.5 5",
} as const;

function TabIcon({ name }: { name: keyof typeof TAB_ICONS }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === "help" && <circle cx="12" cy="12" r="9" />}
      {name === "people" && (
        <>
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="17" cy="9" r="2.4" />
        </>
      )}
      <path d={TAB_ICONS[name]} />
    </svg>
  );
}

export function Layout() {
  const t = useT();
  const lang = useLang();
  const largeText = useStore((s) => s.settings.largeText);
  const hasFamily = useStore((s) => s.children.length > 0 && s.homes.length > 0);
  const child = useActiveChild();
  const switcherOpen = useUi((s) => s.switcherOpen);
  const openTaskId = useUi((s) => s.openTaskId);
  const easy = useEasy();
  const pathname = useLocation().pathname;
  const onToday = pathname === "/";
  // No family yet (Welcome, Onboarding) or already on Help: the pill would be noise.
  const showEmergency = hasFamily && !pathname.startsWith("/start") && pathname !== "/help";
  useApplyEasy();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle("large", largeText);
  }, [lang, largeText]);
  useEffect(() => applyTheme(readTheme()), []);

  // The wordmark leads on Today and before there is a plan; elsewhere the child chip does.
  const brand = onToday || !hasFamily || !child;

  return (
    <div className="app">
      <IllustrationDefs />
      <a className="skip" href="#main">
        {t("nav.skip")}
      </a>
      <header className="topbar">
        {brand ? <Wordmark text={t("app.title")} /> : <ChildChip />}
        <div className="topbar-actions">
          {showEmergency && (
            <Link className="poison" to="/help" aria-label={t("nav.emergencyLabel")}>
              <Siren size={20} weight="fill" aria-hidden="true" />
              <span className="poison-long" aria-hidden="true">
                {t("nav.emergency")}
              </span>
              <span className="poison-short" aria-hidden="true">
                {t("nav.emergencyShort")}
              </span>
            </Link>
          )}
          {hasFamily && (
            <NavLink to="/settings" className="icon-btn" aria-label={t("nav.settings")}>
              <GearSix size={26} weight="regular" aria-hidden="true" />
            </NavLink>
          )}
        </div>
      </header>
      <main id="main" className={`page${hasFamily ? "" : " page-bare"}`} tabIndex={-1}>
        <Outlet />
      </main>
      {hasFamily && (
        <nav className="tabbar" aria-label={t("nav.main")}>
          <NavLink to="/" end className="tab">
            <TabIcon name="today" />
            {t("nav.today")}
          </NavLink>
          {!easy && (
            <NavLink to="/rooms" className="tab">
              <TabIcon name="rooms" />
              {t("nav.rooms")}
            </NavLink>
          )}
          <NavLink to="/help" className="tab">
            <TabIcon name="help" />
            {t("nav.help")}
          </NavLink>
          {!easy && (
            <NavLink to="/people" className="tab">
              <TabIcon name="people" />
              {t("nav.people")}
            </NavLink>
          )}
        </nav>
      )}
      {hasFamily && switcherOpen && <ChildSwitcher />}
      {hasFamily && openTaskId && <TaskSheet />}
      {hasFamily && <RoomDone />}
      <Toaster />
    </div>
  );
}
