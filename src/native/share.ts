// Share sheet: Capacitor Share plugin when native, navigator.share on the web.
import { Share } from "@capacitor/share";
import { isNative } from "./platform";

export type NativeShareResult = "shared" | "cancelled" | "unavailable";
export interface ShareInfo {
  title: string;
  text: string;
  url: string;
}

const isCancel = (e: unknown) => {
  const x = e as { name?: string; message?: string } | null;
  return x?.name === "AbortError" || /cancel/i.test(x?.message ?? "");
};

export async function shareViaSheet(info: ShareInfo): Promise<NativeShareResult> {
  if (isNative()) {
    try {
      await Share.share({
        title: info.title,
        text: info.text,
        url: info.url,
        dialogTitle: info.title,
      });
      return "shared";
    } catch (e) {
      return isCancel(e) ? "cancelled" : "unavailable";
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(info);
      return "shared";
    } catch (e) {
      return isCancel(e) ? "cancelled" : "unavailable";
    }
  }
  return "unavailable";
}
