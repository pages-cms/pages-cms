"use client";

import { useUser } from "@/contexts/user-context";
import { handleSignOut }  from "@/lib/actions/auth";
import { getInitialsFromName } from "@/lib/utils/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

export function User({
  className,
  onClick
}: {
  className?: string,
  onClick?: () => void
}) {
  const { user } = useUser();
  
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={cn(className, "rounded-full")}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://avatars.githubusercontent.com/u/${user.githubId}`} alt={user.githubUsername} />
            <AvatarFallback>{getInitialsFromName(user.githubName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount align="start" className="max-w-[12.5rem]">
        <DropdownMenuLabel>
          <p className="text-sm font-medium truncate">{user.githubName ? user.githubName : user.githubUsername}</p>
          <p className="text-xs font-normal text-muted-foreground truncate">
            {user.githubEmail}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href={`https://github.com/${user.githubUsername}`} target="_blank" onClick={onClick}>
              <span className="mr-4">See GitHub profile</span>
              <ArrowUpRight className="h-3 w-3 ml-auto opacity-50" />
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => { if (onClick) onClick(); await handleSignOut() }}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}