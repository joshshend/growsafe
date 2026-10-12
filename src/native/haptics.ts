// Light tap when a task is marked done. Does nothing on the web or if the call fails.
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isNative } from "./platform";

export async function lightTap(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics are a nicety; ignore failures.
  }
}
