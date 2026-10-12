// Tiny i18n: t(key, params, lang). Falls back to English, then to the key itself.
import en from "./en.json";
import es from "./es.json";

export type Lang = "en" | "es";
const dict: Record<Lang, Record<string, string>> = { en, es };

export function translate(
  key: string,
  params?: Record<string, string | number>,
  lang: Lang = "en",
): string {
  const s = dict[lang][key] ?? dict.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (params && k in params ? String(params[k]) : m));
}

export function hasKey(key: string, lang: Lang = "en"): boolean {
  return key in dict[lang];
}

export const t = translate;
