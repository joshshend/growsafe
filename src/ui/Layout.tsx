import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useStore } from "../store/store";
import { useLang, useT } from "./useT";

export function Layout() {
  const t = useT();
  const lang = useLang();
  const largeText = useStore((s) => s.settings.largeText);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle("large", largeText);
  }, [lang, largeText]);
  return (
    <div className="app">
      <a className="skip" href="#main">
        {t("nav.skip")}
      </a>
      <header className="top">
        <Link to="/" className="brand">
          {t("app.title")}
        </Link>
        <nav aria-label={t("nav.main")}>
          <NavLink to="/plan">{t("nav.plan")}</NavLink>
          <NavLink to="/about">{t("nav.about")}</NavLink>
        </nav>
      </header>
      <main id="main" className="page" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="foot">
        <p className="notice">{t("footer.disclaimer")}</p>
        <a className="callbtn" href="tel:+18002221222">
          {t("footer.poison")}
        </a>
        <p className="foot-hint">{t("footer.poisonHint")}</p>
      </footer>
    </div>
  );
}
