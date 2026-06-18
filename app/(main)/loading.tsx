import { Loader } from "@/components/loader";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Loading");

  return (
    <Loader className="absolute inset-0 text-muted-foreground text-sm bg-background rounded-md">
      {t("text")}
    </Loader>
  );
}
