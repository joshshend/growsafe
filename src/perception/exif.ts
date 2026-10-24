// Re-draws a photo onto a canvas at a smaller size and re-encodes it as JPEG. A canvas carries only pixels,
// so EXIF (including GPS location) and any other metadata are dropped.
export const MAX_EDGE = 1280;
export const JPEG_QUALITY = 0.8;

export function fitSize(w: number, h: number, max = MAX_EDGE): { width: number; height: number } {
  const long = Math.max(w, h);
  if (long <= max) return { width: w, height: h };
  const k = max / long;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

type Drawable = ImageBitmap | HTMLImageElement;
const sizeOf = (d: Drawable) =>
  d instanceof HTMLImageElement
    ? { w: d.naturalWidth, h: d.naturalHeight }
    : { w: d.width, h: d.height };

export async function loadDrawable(blob: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      /* fall through (for example SVG, or a browser without the option) */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function drawToCanvas(d: Drawable, max = MAX_EDGE): HTMLCanvasElement {
  const { w, h } = sizeOf(d);
  const { width, height } = fitSize(w, h, max);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff"; // JPEG has no alpha
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(d, 0, 0, width, height);
  return canvas;
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

// Resized, metadata-free JPEG, plus the canvas for the quality and face checks.
export async function stripAndResize(
  blob: Blob,
  max = MAX_EDGE,
): Promise<{ jpeg: Blob; canvas: HTMLCanvasElement }> {
  const drawable = await loadDrawable(blob);
  const canvas = drawToCanvas(drawable, max);
  if ("close" in drawable) drawable.close();
  return { jpeg: await canvasToJpeg(canvas), canvas };
}
