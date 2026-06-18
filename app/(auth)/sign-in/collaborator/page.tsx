import { InviteSignIn } from "@/components/invite-sign-in";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getTranslations } from "next-intl/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("InviteSignIn");
  const { token } = await searchParams;

  if (!token?.trim()) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle>{t("unavailableTitle")}</EmptyTitle>
          <EmptyDescription>{t("unavailableLinkDesc")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <InviteSignIn token={token.trim()} />;
}
