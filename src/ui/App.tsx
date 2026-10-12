// Routes (HashRouter so static hosting and Capacitor both work). Copy must never claim a home is "safe".
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { useStore } from "../store/store";
import { About } from "./About";
import { ChildForm, HomeForm } from "./Forms";
import { Layout } from "./Layout";
import { Plan } from "./Plan";
import { RoomPage } from "./RoomPage";
import { TaskPage } from "./TaskPage";
import { Welcome } from "./Welcome";
import { useT } from "./useT";

function NotFound() {
  const t = useT();
  return (
    <div className="stack">
      <h1>{t("common.notFound")}</h1>
      <Link className="btn primary" to="/">
        {t("common.goHome")}
      </Link>
    </div>
  );
}

export function App() {
  const hydrated = useStore((s) => s.hydrated);
  const t = useT();
  if (!hydrated) {
    return (
      <p className="loading" role="status">
        {t("common.loading")}
      </p>
    );
  }
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Welcome />} />
          <Route path="child/new" element={<ChildForm />} />
          <Route path="home/new" element={<HomeForm />} />
          <Route path="plan" element={<Plan />} />
          <Route path="task/:id" element={<TaskPage />} />
          <Route path="room/:homeId/:room" element={<RoomPage />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
