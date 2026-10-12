import { afterEach, describe, expect, it, vi } from "vitest";
import { isNative } from "./platform";
import {
  cancelReminder,
  notificationId,
  requestPermission,
  scheduleReminder,
} from "./notifications";
import { shareViaSheet } from "./share";
import { lightTap } from "./haptics";
import { takePhoto } from "./camera";
import { reminderDate, remindMe } from "./reminder";

afterEach(() => vi.restoreAllMocks());

describe("web fallbacks", () => {
  it("is not native in tests", () => {
    expect(isNative()).toBe(false);
  });

  it("notifications are unsupported on the web", async () => {
    expect(await requestPermission()).toBe(false);
    expect(await scheduleReminder("t1", "x", new Date())).toBe("unsupported");
    await expect(cancelReminder("t1")).resolves.toBeUndefined();
  });

  it("notification ids are stable positive ints", () => {
    const a = notificationId("task-abc");
    expect(a).toBe(notificationId("task-abc"));
    expect(a).toBeGreaterThan(0);
    expect(notificationId("task-abd")).not.toBe(a);
  });

  it("haptics do nothing on the web", async () => {
    await expect(lightTap()).resolves.toBeUndefined();
  });

  it("share uses navigator.share when present", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const info = { title: "t", text: "x", url: "https://a.b/" };
    expect(await shareViaSheet(info)).toBe("shared");
    expect(share).toHaveBeenCalledWith(info);
    share.mockRejectedValue(Object.assign(new Error("no"), { name: "AbortError" }));
    expect(await shareViaSheet(info)).toBe("cancelled");
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    expect(await shareViaSheet(info)).toBe("unavailable");
  });

  it("takePhoto resolves the chosen file, or null on cancel", async () => {
    const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      Object.defineProperty(this, "files", { value: [file] });
      this.dispatchEvent(new Event("change"));
    });
    expect(await takePhoto()).toBe(file);
    click.mockImplementation(function (this: HTMLInputElement) {
      this.dispatchEvent(new Event("cancel"));
    });
    expect(await takePhoto()).toBeNull();
  });
});

describe("reminders", () => {
  const now = new Date(2026, 9, 12, 15, 0); // Monday
  it("computes dates", () => {
    expect(reminderDate("tomorrow", now)?.getDate()).toBe(13);
    expect(reminderDate("tomorrow", now)?.getHours()).toBe(9);
    expect(reminderDate("weekend", now)?.getDate()).toBe(17);
    expect(reminderDate("custom", now, "2026-11-02")?.getMonth()).toBe(10);
    expect(reminderDate("custom", now, "")).toBeNull();
  });

  it("falls back to an .ics download on the web", async () => {
    const create = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const r = await remindMe({ taskId: "t", title: "Do it", description: "d", date: now });
    expect(r).toBe("ics");
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
