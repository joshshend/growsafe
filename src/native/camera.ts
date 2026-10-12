// takePhoto(): a Blob from the native camera/library, or from <input type=file capture> on the web.
// Resolves null when the person cancels. T9 (photo scan) builds on this.
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNative } from "./platform";

function pickFile(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    const finish = (b: Blob | null) => {
      input.remove();
      resolve(b);
    };
    input.addEventListener("change", () => finish(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

export async function takePhoto(): Promise<Blob | null> {
  if (!isNative()) return pickFile();
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      correctOrientation: true,
    });
    if (!photo.webPath) return null;
    return await (await fetch(photo.webPath)).blob();
  } catch {
    return null; // cancelled or permission denied
  }
}
