// Face check with the browser's FaceDetector API where it exists (Chrome/Android; not Safari).
// Where it does not, the screen tells the person up front to keep people out of the photo.
interface FaceDetectorLike {
  detect(img: CanvasImageSource): Promise<unknown[]>;
}
type FaceDetectorCtor = new (opts?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorLike;

const ctor = (): FaceDetectorCtor | undefined =>
  (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector;

export const faceDetectorAvailable = (): boolean => typeof ctor() === "function";

// true: a face was found (discard the photo). false: none found. null: could not check.
export async function hasFace(canvas: HTMLCanvasElement): Promise<boolean | null> {
  const C = ctor();
  if (!C) return null;
  try {
    const faces = await new C({ fastMode: true, maxDetectedFaces: 1 }).detect(canvas);
    return faces.length > 0;
  } catch {
    return null;
  }
}
