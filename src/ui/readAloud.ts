// Read aloud: pure script builder (tested) plus thin SpeechSynthesis wrappers.
import type { HazardEntry, Task } from "../kb/schema";
import { translate, type Lang } from "../i18n/t";
import { localHazard } from "./format";

// Remove URLs and bracketed citation marks so they are never spoken.
function clean(s: string): string {
  return s
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstSentence(s: string): string {
  const m = clean(s).match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : clean(s);
}

// Returns the phrases to speak, in order: title, why it matters (one sentence), then "Step n." + text.
export function buildSpeechScript(task: Task, kb: HazardEntry[], lang: Lang): string[] {
  const hazard = kb.find((h) => h.id === task.hazard_id);
  if (!hazard) return [];
  const local = localHazard(hazard, lang);
  const out: string[] = [clean(local.name)];
  const why = firstSentence(local.why);
  if (why) out.push(why);
  local.steps.forEach((text, i) => {
    out.push(`${translate("easy.step", { n: i + 1 }, lang)} ${clean(text)}`);
  });
  return out.filter(Boolean);
}

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// Speaks each phrase as its own utterance so there is a short pause between them.
export function speak(phrases: string[], lang: Lang, onEnd: () => void): void {
  if (!speechSupported() || phrases.length === 0) {
    onEnd();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  phrases.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = lang === "es" ? "es-US" : "en-US";
    if (i === phrases.length - 1) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    synth.speak(u);
  });
}
