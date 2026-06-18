"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";

export function AdminButton() {
  const { user } = useUser();
  const t = useTranslations("AdminButton");

  if (!user?.isAdmin) return null;

  return (
    <Button asChild variant="ghost" size="icon-sm" className="rounded-full">
      <Link href="/admin" aria-label={t("label")}>
        <Settings className="size-4" />
      </Link>
    </Button>
  );
}
