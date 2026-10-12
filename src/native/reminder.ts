// "Remind me": pick a time, then schedule natively or fall back to downloading an .ics file.
import { buildIcs, nextSaturdayMorning } from "../ics/ics";
import { scheduleReminder } from "./notifications";
import { isNative } from "./platform";

export type ReminderChoice = "tomorrow" | "weekend" | "custom";

// Tomorrow 09:00, this weekend (Saturday 10:00), or a chosen yyyy-mm-dd at 09:00. Null if invalid.
export function reminderDate(choice: ReminderChoice, now: Date, custom?: string): Date | null {
  if (choice === "tomorrow") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  }
  if (choice === "weekend") return nextSaturdayMorning(now);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(custom ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function downloadIcs(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type RemindOutcome = "scheduled" | "ics" | "denied";

export async function remindMe(opts: {
  taskId: string;
  title: string;
  description: string;
  date: Date;
}): Promise<RemindOutcome> {
  if (isNative()) {
    const r = await scheduleReminder(opts.taskId, opts.title, opts.date);
    if (r === "scheduled") return "scheduled";
    if (r === "denied") return "denied";
  }
  downloadIcs(
    "growsafe-reminder.ics",
    buildIcs({ title: opts.title, description: opts.description, start: opts.date, minutes: 15 }),
  );
  return "ics";
}
