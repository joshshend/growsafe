// Plan <-> URL-safe string (T7). JSON -> deflate -> base64url. No server involved.
import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { SharedPlanSchema, type SharedPlan } from "./schema";

export const MAX_ENCODED_BYTES = 8 * 1024; // above this, suggest file export instead
export const MAX_INFLATED_BYTES = 256 * 1024; // guards against zip bombs

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("Share data is not valid base64url.");
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Returns the data string only (the part after `d=`). Validates before encoding.
export function encodePlan(plan: SharedPlan): string {
  const valid = SharedPlanSchema.parse(plan);
  return toBase64Url(deflateSync(strToU8(JSON.stringify(valid)), { level: 9 }));
}

// Accepts the bare data string or a full share link.
export function decodePlan(s: string): SharedPlan {
  const m = /[?&]d=([^&#]*)/.exec(s);
  const data = (m ? m[1] : s).trim();
  if (!data) throw new Error("No share data found.");
  let json: string;
  try {
    json = strFromU8(inflateSync(fromBase64Url(data)));
  } catch {
    throw new Error("Share data is corrupted or not a GrowSafe link.");
  }
  if (json.length > MAX_INFLATED_BYTES) throw new Error("Share data is too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Share data is corrupted or not a GrowSafe link.");
  }
  const v = (raw as { v?: unknown } | null)?.v;
  if (v !== 1) throw new Error(`Unsupported share version: ${String(v)}.`);
  return SharedPlanSchema.parse(raw);
}

export function shareUrl(origin: string, plan: SharedPlan): string {
  return `${origin.replace(/\/+$/, "")}/#/import?d=${encodePlan(plan)}`;
}

// True when the link is too long to share reliably; the UI should offer file export instead.
export function isTooLarge(data: string): boolean {
  return data.length > MAX_ENCODED_BYTES;
}
