import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFoundPage");

  return (
    <Empty className="absolute inset-0 border-0 rounded-none">
      <EmptyHeader>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("desc")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link className={buttonVariants({ variant: "default" })} href="/">
          {t("goHome")}
        </Link>
      </EmptyContent>
    </Empty>
  )
}
