// Local reminders. Native: iOS local notifications. Web: unsupported (callers fall back to .ics).
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNative } from "./platform";

export type ReminderResult = "scheduled" | "denied" | "unsupported";

// Stable positive 31-bit integer per task id (iOS notification ids are numbers).
export function notificationId(taskId: string): number {
  let h = 5381;
  for (const ch of taskId) h = (h * 33 + ch.charCodeAt(0)) | 0;
  return h & 0x7fffffff || 1;
}

export async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === "granted") return true;
    if (cur.display === "denied") return false;
    return (await LocalNotifications.requestPermissions()).display === "granted";
  } catch {
    return false;
  }
}

export async function scheduleReminder(
  taskId: string,
  title: string,
  date: Date,
): Promise<ReminderResult> {
  if (!isNative()) return "unsupported";
  if (!(await requestPermission())) return "denied";
  try {
    await LocalNotifications.schedule({
      notifications: [
        { id: notificationId(taskId), title, body: "GrowSafe", schedule: { at: date } },
      ],
    });
    return "scheduled";
  } catch {
    return "unsupported";
  }
}

export async function cancelReminder(taskId: string): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId(taskId) }] });
  } catch {
    // Nothing to cancel.
  }
}
