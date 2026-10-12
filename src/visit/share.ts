// Hand a link to the person: native share sheet, else copy, else show it for manual copying.
export type ShareResult = "shared" | "copied" | "manual" | "cancelled";

export async function shareLink(
  url: string,
  info: { title: string; text: string },
): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: info.title, text: info.text, url });
      return "shared";
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return "cancelled";
      // Any other failure: fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual";
  }
}

// Where links point: this page's origin and path, without index.html or the hash.
export function appBase(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname.replace(/index\.html$/, "")}`;
}
