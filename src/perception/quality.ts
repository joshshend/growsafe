// Cheap checks that a photo is usable before we send it anywhere: not too dark, not too blurry.
// These are heuristics, not guarantees; a failure just asks for a retake.
export type QualityIssue = "dark" | "blurry";
export interface Quality {
  ok: boolean;
  issue?: QualityIssue;
  luminance: number; // mean 0..255
  sharpness: number; // variance of the Laplacian on the grayscale image
}

export const MIN_LUMINANCE = 45;
export const MIN_SHARPNESS = 20;

export function assessPixels(rgba: ArrayLike<number>, w: number, h: number): Quality {
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!;
    gray[i] = g;
    sum += g;
  }
  const luminance = w * h ? sum / (w * h) : 0;
  let n = 0;
  let s = 0;
  let s2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1]! + gray[i + 1]! + gray[i - w]! + gray[i + w]! - 4 * gray[i]!;
      s += lap;
      s2 += lap * lap;
      n++;
    }
  }
  const sharpness = n ? s2 / n - (s / n) ** 2 : 0;
  if (luminance < MIN_LUMINANCE) return { ok: false, issue: "dark", luminance, sharpness };
  if (sharpness < MIN_SHARPNESS) return { ok: false, issue: "blurry", luminance, sharpness };
  return { ok: true, luminance, sharpness };
}

// Looks at a small copy (long edge 256) so it is fast on a phone.
export function assessCanvas(canvas: HTMLCanvasElement): Quality {
  const k = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
  const w = Math.max(3, Math.round(canvas.width * k));
  const h = Math.max(3, Math.round(canvas.height * k));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) return { ok: true, luminance: 128, sharpness: 100 }; // cannot check: let it through
  ctx.drawImage(canvas, 0, 0, w, h);
  return assessPixels(ctx.getImageData(0, 0, w, h).data, w, h);
}
