export const LANGUAGE_COOKIE_KEY = "locale";

export const SUPPORTED_LANGUAGES = ["en", "de", "es", "fr"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
