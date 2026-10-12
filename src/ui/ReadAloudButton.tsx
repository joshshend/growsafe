import { useEffect, useState } from "react";
import { SpeakerHigh, Stop } from "@phosphor-icons/react";
import { loadKb } from "../kb";
import type { Task } from "../kb/schema";
import { buildSpeechScript, speak, speechSupported, stopSpeaking } from "./readAloud";
import { useLang, useT } from "./useT";

export function ReadAloudButton({ task }: { task: Task }) {
  const t = useT();
  const lang = useLang();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!speechSupported()) return null;
  return (
    <button
      type="button"
      className="btn btn-block"
      onClick={() => {
        if (playing) {
          stopSpeaking();
          setPlaying(false);
        } else {
          setPlaying(true);
          speak(buildSpeechScript(task, loadKb(), lang), lang, () => setPlaying(false));
        }
      }}
    >
      {playing ? (
        <Stop size={22} weight="fill" aria-hidden="true" />
      ) : (
        <SpeakerHigh size={22} weight="duotone" aria-hidden="true" />
      )}
      {playing ? t("easy.stop") : t("easy.read")}
    </button>
  );
}
