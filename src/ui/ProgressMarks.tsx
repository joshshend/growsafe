// Doorframe progress mark (.pm in index.css): a jamb with one pencil tick per task, climbing as tasks are done.
// The tick just above the finished ones is yellow ("now"). With more than MAX_TICKS tasks, ticks stand for groups
// of tasks and fill in proportion. The accessible label is passed in (it comes from i18n), because the ticks
// themselves carry no text. Pass `decorative` when the same numbers are already written next to it (Rooms rows),
// or `progressbar` where a screen reader should hear it as a value (Today's count).

const MAX_TICKS = 12;

export function ProgressMarks({
  done,
  total,
  label,
  large = false,
  decorative = false,
  progressbar = false,
}: {
  done: number;
  total: number;
  label: string;
  large?: boolean;
  decorative?: boolean;
  progressbar?: boolean;
}) {
  const ticks = Math.min(Math.max(total, 0), MAX_TICKS);
  const safeDone = Math.min(Math.max(done, 0), Math.max(total, 0));
  // Proportional when grouped; exact when total <= MAX_TICKS. A tick only fills once every task in it is done.
  const filled = total <= MAX_TICKS ? safeDone : Math.floor((safeDone / total) * ticks);
  const items = Array.from({ length: ticks }, (_, i) => {
    if (i < filled) return "on";
    if (i === filled && safeDone < total) return "now";
    return "";
  });
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : progressbar
      ? {
          role: "progressbar" as const,
          "aria-label": label,
          "aria-valuemin": 0,
          "aria-valuemax": total,
          "aria-valuenow": safeDone,
        }
      : { role: "img" as const, "aria-label": label };
  return (
    <span className={`pm${large ? " lg" : ""}`} {...a11y}>
      {items.map((cls, i) => (
        <i key={i} className={cls || undefined} />
      ))}
    </span>
  );
}
