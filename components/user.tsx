"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useUser } from "@/contexts/user-context";
import { signOut } from "@/lib/auth-client";
import { getInitialsFromName } from "@/lib/utils/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function User({
  className,
  onClick,
  align = "end",
}: {
  className?: string;
  onClick?: () => void;
  align?: "start" | "center" | "end";
}) {
  const { user } = useUser();
  const t = useTranslations("UserMenu");
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(className, "rounded-full")}
        >
          <Avatar className="size-6">
            <AvatarImage
              src={
                user?.githubUsername
                  ? `https://github.com/${user.githubUsername}.png`
                  : `https://unavatar.io/${user?.email}?fallback=false`
              }
              alt={user?.name || user.email}
            />
            <AvatarFallback>
              {getInitialsFromName(user.name ?? undefined)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount align={align} className="max-w-[12.5rem]">
        <DropdownMenuLabel>
          <div className="text-sm font-medium truncate">
            {user.name || user.githubUsername || user.email}
          </div>
          <div className="text-xs font-normal text-muted-foreground truncate">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="w-40 text-xs text-muted-foreground font-medium">
          {t("theme")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" onClick={onClick}>
            {t("light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" onClick={onClick}>
            {t("dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" onClick={onClick}>
            {t("system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">{t("settings")}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            if (onClick) onClick();
            await signOut();
            window.location.assign("/sign-in");
          }}
        >
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
