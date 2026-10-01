import zh from "@/src/dictionaries/zh.json";
import en from "@/src/dictionaries/en.json";
import type { Locale } from "./locale";
export function foundationCopy(locale: Locale) {
  return locale === "en" ? en.foundation : zh.foundation;
}
