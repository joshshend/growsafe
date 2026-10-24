// The photo path end to end: resize and strip, check quality and faces, ask the provider.
// Every outcome that is not a list of findings is an exception the UI turns into one plain line.
import type { Finding } from "../kb/schema";
import { stripAndResize } from "./exif";
import { hasFace } from "./faces";
import { assessCanvas } from "./quality";
import { DetectError, type PerceptionProvider } from "./provider";

export type PhotoIssue = "dark" | "blurry" | "face" | "unreadable";
export class PhotoError extends Error {
  constructor(public issue: PhotoIssue) {
    super(issue);
    this.name = "PhotoError";
  }
}

// The photo option may only be used after the person agreed on the consent screen.
export const mayScan = (settings: { perceptionConsent: boolean }): boolean =>
  settings.perceptionConsent === true;

export async function scanPhoto(
  photo: Blob,
  cues: string[],
  provider: PerceptionProvider,
  lang: "en" | "es" = "en",
): Promise<Finding[]> {
  let prepared;
  try {
    prepared = await stripAndResize(photo);
  } catch {
    throw new PhotoError("unreadable");
  }
  const q = assessCanvas(prepared.canvas);
  if (!q.ok) throw new PhotoError(q.issue ?? "blurry");
  if ((await hasFace(prepared.canvas)) === true) throw new PhotoError("face");
  return provider.detect(prepared.jpeg, cues, lang);
}

// Shown only when the proxy is unreachable or errors, and always labelled "Sample result" in the UI.
export const SAMPLE_CUES = ["unanchored_tv", "blind_cord", "uncovered_outlet"];
export function sampleFindings(offered: string[]): Finding[] {
  const pick = SAMPLE_CUES.filter((c) => offered.includes(c));
  const use = pick.length ? pick : offered.slice(0, 2);
  return use.map((cue) => ({ cue, confidence: 1 }));
}

export { DetectError };
