// "Mia · 10 months": opens the child switcher. Used in the top bar and at the top of Today.
import { useStore } from "../store/store";
import { ageText } from "./format";
import { useActiveChild, useUi } from "./ui-state";
import { useT } from "./useT";

export function ChildChip() {
  const t = useT();
  const child = useActiveChild();
  const hasFamily = useStore((s) => s.children.length > 0 && s.homes.length > 0);
  const setSwitcher = useUi((s) => s.setSwitcher);
  if (!hasFamily || !child) return null;
  const age = ageText(t, child, new Date());
  return (
    <button
      type="button"
      className="chip chip-who"
      aria-haspopup="dialog"
      aria-label={t("switcher.label", { name: child.nickname, age })}
      onClick={() => setSwitcher(true)}
    >
      <span aria-hidden="true">{age ? `${child.nickname} · ${age}` : child.nickname}</span>
    </button>
  );
}
