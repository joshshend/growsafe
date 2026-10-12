import { Check, Plus } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { ageText } from "./format";
import { Sheet } from "./Sheet";
import { useActiveChild, useUi } from "./ui-state";
import { useT } from "./useT";

export function ChildSwitcher() {
  const t = useT();
  const nav = useNavigate();
  const children = useStore((s) => s.children);
  const active = useActiveChild();
  const setActive = useUi((s) => s.setActiveChild);
  const setSwitcher = useUi((s) => s.setSwitcher);
  const close = () => setSwitcher(false);
  const now = new Date();
  return (
    <Sheet title={t("switcher.title")} onClose={close}>
      <ul className="rows">
        {children.map((c) => (
          <li key={c.id} className="row">
            <button
              type="button"
              className="row-link"
              aria-pressed={active?.id === c.id}
              onClick={() => {
                setActive(c.id);
                close();
              }}
            >
              <span className="avatar" aria-hidden="true">
                {c.nickname.trim().charAt(0).toUpperCase()}
              </span>
              <span className="row-body">
                <span className="row-title">{c.nickname}</span>
                <span className="row-sub">{ageText(t, c, now)}</span>
              </span>
              {active?.id === c.id && <Check size={24} weight="bold" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-block"
        onClick={() => {
          close();
          nav("/child/new");
        }}
      >
        <Plus size={20} weight="bold" aria-hidden="true" />
        {t("plan.addChild")}
      </button>
    </Sheet>
  );
}
