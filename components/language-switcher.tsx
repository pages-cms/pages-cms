"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  LANGUAGE_COOKIE_KEY,
  isLanguage,
  SUPPORTED_LANGUAGES,
} from "@/i18n/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languageLabelKey = {
  en: "en",
  de: "de",
} as const;

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const language = isLanguage(locale) ? locale : "en";

  return (
    <Select
      value={language}
      onValueChange={(value) => {
        if (isLanguage(value)) {
          if (value === language) return;
          document.cookie = `${LANGUAGE_COOKIE_KEY}=${value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }
      }}
    >
      <SelectTrigger size="sm" className="h-8 min-w-[9rem]">
        <Globe className="h-4 w-4" />
        <SelectValue aria-label={t("label")} />
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_LANGUAGES.map((option) => (
          <SelectItem key={option} value={option}>
            {t(languageLabelKey[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}