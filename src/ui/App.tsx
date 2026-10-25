// Routes (HashRouter so static hosting and Capacitor both work). Copy must never claim a home is "safe".
import { useEffect } from "react";
import { HashRouter, Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { useStore } from "../store/store";
import { Briefing } from "./Briefing";
import { EmergencyCard } from "./Emergency";
import { Ahead } from "./Ahead";
import { ChildForm, HomeForm } from "./Forms";
import { Height } from "./Height";
import { Help } from "./Help";
import { Layout } from "./Layout";
import { Merge } from "./Merge";
import { MedicineCheck } from "./MedicineCheck";
import { Onboarding } from "./Onboarding";
import { People } from "./People";
import { RoomPage, Rooms } from "./Rooms";
import { Scan } from "./Scan";
import { Privacy, Settings } from "./Settings";
import { Today } from "./Today";
import { useUi } from "./ui-state";
import { Visit } from "./Visit";
import { Weekend } from "./Weekend";
import { Welcome } from "./Welcome";
import { useT } from "./useT";

function NotFound() {
  const t = useT();
  return (
    <div className="flow">
      <h1 className="t-title">{t("common.notFound")}</h1>
      <Link className="btn btn-primary btn-block" to="/">
        {t("common.goHome")}
      </Link>
    </div>
  );
}

function Home() {
  const hasFamily = useStore((s) => s.children.length > 0 && s.homes.length > 0);
  return hasFamily ? <Today /> : <Welcome />;
}

// Old /task/:id links open the task sheet over Today.
function TaskLink() {
  const { id } = useParams();
  const openTask = useUi((s) => s.openTask);
  useEffect(() => {
    if (id) openTask(id);
  }, [id, openTask]);
  return <Navigate to="/" replace />;
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
          <Route index element={<Home />} />
          <Route path="start" element={<Onboarding />} />
          <Route path="child/new" element={<ChildForm />} />
          <Route path="home/new" element={<HomeForm />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="room/:homeId/:room" element={<RoomPage />} />
          <Route path="scan" element={<Scan />} />
          <Route path="task/:id" element={<TaskLink />} />
          <Route path="ahead" element={<Ahead />} />
          <Route path="weekend" element={<Weekend />} />
          <Route path="help" element={<Help />} />
          <Route path="people" element={<People />} />
          <Route path="emergency/:childId" element={<EmergencyCard />} />
          <Route path="briefing/:homeId" element={<Briefing />} />
          <Route path="medicine/:homeId" element={<MedicineCheck />} />
          <Route path="visit" element={<Visit />} />
          <Route path="merge" element={<Merge />} />
          <Route path="height/:childId?" element={<Height />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
