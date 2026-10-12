import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  CaretDown,
  GearSix,
  House,
  Lifebuoy,
  Phone,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";
import { useStore } from "../store/store";
import { ageText } from "./format";
import { ChildSwitcher } from "./ChildSwitcher";
import { TaskSheet } from "./TaskSheet";
import { useApplyEasy, useEasy } from "./easy";
import { applyTheme, readTheme } from "./theme";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";

const POISON_HREF = "tel:+18002221222";

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

export function Layout() {
  const t = useT();
  const lang = useLang();
  const largeText = useStore((s) => s.settings.largeText);
  const hasFamily = useStore((s) => s.children.length > 0 && s.homes.length > 0);
  const child = useActiveChild();
  const setSwitcher = useUi((s) => s.setSwitcher);
  const switcherOpen = useUi((s) => s.switcherOpen);
  const openTaskId = useUi((s) => s.openTaskId);
  const easy = useEasy();
  useApplyEasy();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle("large", largeText);
  }, [lang, largeText]);
  useEffect(() => applyTheme(readTheme()), []);

  return (
    <div className="app">
      <a className="skip" href="#main">
        {t("nav.skip")}
      </a>
      <header className="topbar">
        {hasFamily && child ? (
          <button
            type="button"
            className="switcher"
            aria-haspopup="dialog"
            aria-label={t("switcher.label", {
              name: child.nickname,
              age: ageText(t, child, new Date()),
            })}
            onClick={() => setSwitcher(true)}
          >
            <span className="avatar" aria-hidden="true">
              {child.nickname.trim().charAt(0).toUpperCase()}
            </span>
            <span className="switcher-name" aria-hidden="true">
              <span className="switcher-nick">{child.nickname}</span>
              <span className="switcher-age">{ageText(t, child, new Date())}</span>
            </span>
            <CaretDown size={16} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
        <div className="topbar-actions">
          <a className="poison" href={POISON_HREF} aria-label={t("poison.label")}>
            <Phone size={22} weight="fill" aria-hidden="true" />
            <span aria-hidden="true">{t("poison.short")}</span>
          </a>
          {hasFamily && (
            <NavLink to="/settings" className="icon-btn" aria-label={t("nav.settings")}>
              <GearSix size={26} weight="duotone" aria-hidden="true" />
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
            <House size={26} weight="duotone" aria-hidden="true" />
            {t("nav.today")}
          </NavLink>
          {!easy && (
            <NavLink to="/rooms" className="tab">
              <SquaresFour size={26} weight="duotone" aria-hidden="true" />
              {t("nav.rooms")}
            </NavLink>
          )}
          <NavLink to="/help" className="tab">
            <Lifebuoy size={26} weight="duotone" aria-hidden="true" />
            {t("nav.help")}
          </NavLink>
          {!easy && (
            <NavLink to="/people" className="tab">
              <UsersThree size={26} weight="duotone" aria-hidden="true" />
              {t("nav.people")}
            </NavLink>
          )}
        </nav>
      )}
      {hasFamily && switcherOpen && <ChildSwitcher />}
      {hasFamily && openTaskId && <TaskSheet />}
      <Toaster />
    </div>
  );
}
