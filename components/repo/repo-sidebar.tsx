"use client";

import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useRepo } from "@/contexts/repo-context";
import { User } from "@/components/user";
import { RepoDropdown } from "@/components/repo/repo-dropdown";
import { RepoNav } from "@/components/repo/repo-nav";
import { About } from "@/components/about";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const RepoSidebar = ({
  onClick
}: {
  onClick?: () => void
}) => {
  const { user } = useUser();
  const repo = useRepo();

  const account = user?.accounts?.find((account) => account.login === repo.owner);

  return (
    <Sidebar>
      <SidebarContent>
        <RepoDropdown onClick={onClick} />

        <SidebarGroup className="flex-1 overflow-auto">
          <SidebarMenu>
            <nav className="flex flex-col gap-y-1">
              <RepoNav onClick={onClick} />
            </nav>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarFooter>
          <footer>
            <User onClick={onClick} />
            {/* <About onClick={onClick} /> */}
          </footer>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}

export { RepoSidebar };