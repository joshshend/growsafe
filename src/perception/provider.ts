// The seam between the app and any photo-reading service. A provider only reports cues it can see;
// the knowledge base (findingsToTasks) decides what that means.
import type { PhotoFinding } from "./box";

export interface PerceptionProvider {
  detect(img: Blob, cues: string[], lang?: "en" | "es"): Promise<PhotoFinding[]>;
}

export type DetectFailure =
  | "offline"
  | "timeout"
  | "unavailable"
  | "rate_limited"
  | "daily_cap"
  | "provider_error"
  | "bad_output";

// Every failure the photo path can raise. The UI maps `code` to one plain line and shows the tap list.
export class DetectError extends Error {
  constructor(public code: DetectFailure) {
    super(code);
    this.name = "DetectError";
  }
}
