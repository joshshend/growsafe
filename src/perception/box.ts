// A hazard cue's place in the photo: [ymin, xmin, ymax, xmax], integers 0-1000 of the whole image
// (Gemini's normalized box format). Re-checked on the device even though the proxy already checks it.
import { z } from "zod";
import { FindingSchema, type Finding } from "../kb/schema";

export type Box = [number, number, number, number];
export const MAX_BOX_AREA = 0.9;

const BoxSchema = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .transform((b) => b.map((n) => Math.round(n)) as Box)
  .refine(([y0, x0, y1, x1]) => {
    const inRange = [y0, x0, y1, x1].every((n) => n >= 0 && n <= 1000);
    return inRange && y0 < y1 && x0 < x1 && ((y1 - y0) * (x1 - x0)) / 1_000_000 <= MAX_BOX_AREA;
  });

export function parseBox(raw: unknown): Box | undefined {
  const r = BoxSchema.safeParse(raw);
  return r.success ? r.data : undefined;
}

// A finding as the photo path carries it: the shared Finding plus an optional box.
export type PhotoFinding = Finding & { box?: Box };

// Loose on purpose: a bad box is dropped by parseBox, it never rejects the finding.
export const PhotoFindingSchema = FindingSchema.extend({ box: z.unknown().optional() }).transform(
  (f): PhotoFinding => {
    const { box, ...rest } = f;
    const b = parseBox(box);
    return b ? { ...rest, box: b } : rest;
  },
);

// Percent rectangle for an SVG viewBox of 0..1000 on both axes.
export const boxRect = ([y0, x0, y1, x1]: Box) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
