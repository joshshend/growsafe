import { shareViaSheet } from "../native/share";
import { isNative } from "../native/platform";

// Hand a link to the person: native share sheet, else copy, else show it for manual copying.
export type ShareResult = "shared" | "copied" | "manual" | "cancelled";

export async function shareLink(
  url: string,
  info: { title: string; text: string },
): Promise<ShareResult> {
  const r = await shareViaSheet({ title: info.title, text: info.text, url });
  if (r === "shared") return "shared";
  if (r === "cancelled") return "cancelled";
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual";
  }
}

// Where links point: this page's origin and path, without index.html or the hash.
// In the native app the page origin is capacitor://localhost, which is useless to recipients, so
// links use VITE_PUBLIC_URL (the deployed web app) when it is set.
export function appBase(): string {
  const pub = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (isNative() && pub) return pub.endsWith("/") ? pub : `${pub}/`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname.replace(/index\.html$/, "")}`;
}
