import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  isLanguage,
  LANGUAGE_COOKIE_KEY,
  SUPPORTED_LANGUAGES,
  type Language,
} from "./constants";

export {
  isLanguage,
  LANGUAGE_COOKIE_KEY,
  SUPPORTED_LANGUAGES,
  type Language,
};
 
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LANGUAGE_COOKIE_KEY)?.value;
  const locale = cookieLocale && isLanguage(cookieLocale) ? cookieLocale : "en";
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
