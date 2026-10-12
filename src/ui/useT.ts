import { useCallback } from "react";
import { translate, type Lang } from "../i18n/t";
import { useStore } from "../store/store";

export type TFn = (key: string, params?: Record<string, string | number>) => string;

// Translation function bound to the saved language; components re-render when the language changes.
export function useT(): TFn {
  const lang: Lang = useStore((s) => s.settings.lang);
  return useCallback((key, params) => translate(key, params, lang), [lang]);
}

export function useLang(): Lang {
  return useStore((s) => s.settings.lang);
}
