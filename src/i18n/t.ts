// Tiny i18n: t(key, params, lang). Falls back to English, then to the key itself.
import en from "./en.json";
import es from "./es.json";

export type Lang = "en" | "es";
// Feature-owned strings live in src/i18n/features/<name>.en.json and <name>.es.json (merged here)
// so parallel work never edits the same file. Core strings stay in en.json / es.json.
const featureEn = import.meta.glob<Record<string, string>>("./features/*.en.json", {
  eager: true,
  import: "default",
});
const featureEs = import.meta.glob<Record<string, string>>("./features/*.es.json", {
  eager: true,
  import: "default",
});
const dict: Record<Lang, Record<string, string>> = {
  en: Object.assign({}, en, ...Object.values(featureEn)),
  es: Object.assign({}, es, ...Object.values(featureEs)),
};

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
