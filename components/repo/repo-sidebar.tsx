"use client";

import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useRepo } from "@/contexts/repo-context";
import { User } from "@/components/user";
import { RepoDropdown } from "@/components/repo/repo-dropdown";
import { RepoNav } from "@/components/repo/repo-nav";
import { About } from "@/components/about";
import { ArrowLeft, ChevronDown, FileStack, FileText, FolderOpen, Settings, Users } from "lucide-react";
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
import { useConfig } from "@/contexts/config-context";
import { useMemo } from "react";

const RepoSidebar = ({
  onClick
}: {
  onClick?: () => void
}) => {
  const { user } = useUser();
  const repo = useRepo();
  const { config } = useConfig();

  const account = user?.accounts?.find((account) => account.login === repo.owner);

  const userItems = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;
    return configObject.content?.map((item: any) => ({
      key: item.name,
      icon: item.type === "collection"
        ? <FileStack className="h-5 w-5 mr-2" />
        : <FileText className="h-5 w-5 mr-2" />
      ,
      href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${item.type}/${encodeURIComponent(item.name)}`,
      label: item.label || item.name,
    })) || [];
  }, [config]);

  const mediaItems = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;
    const mediaItems = configObject.media?.map((item: any) => ({
      key: item.name || "media",
      icon: <FolderOpen className="h-5 w-5 mr-2" />,
      href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/media/${item.name}`,
      label: item.label || item.name || "Media"
    })) || [];

    return mediaItems;
  }, [config]);

  const otherItems = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;

    const settingsItem = configObject.settings !== false
      ? {
        key: "settings",
        icon: <Settings className="h-5 w-5 mr-2" />,
        href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/settings`,
        label: "Settings"
      }
      : null;

    const collaboratorsItem = configObject && Object.keys(configObject).length !== 0 && user?.githubId
      ? {
        key: "collaborators",
        icon: <Users className="h-5 w-5 mr-2" />,
        href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collaborators`,
        label: "Collaborators"
      }
      : null;

    return [
      settingsItem,
      collaboratorsItem
    ].filter(Boolean);
  }, [config, user]);

  return (
    <Sidebar>
      <SidebarContent>
        <RepoDropdown onClick={onClick} />

        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarMenu>
            <RepoNav onClick={onClick} items={userItems} />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Media</SidebarGroupLabel>
          <SidebarMenu>
            <RepoNav onClick={onClick} items={mediaItems} />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarMenu>
            <RepoNav onClick={onClick} items={otherItems} />
            <About onClick={onClick} />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarFooter className="flex items-center justify-between">
          <User onClick={onClick} className="flex-1" />
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}

export { RepoSidebar };