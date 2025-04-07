"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { RepoBranches } from "./repo-branches";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronsUpDown } from "lucide-react";
import { SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import Link from "next/link";

export function RepoDropdown({
  onClick
}: {
  onClick?: () => void;
}) {
  const router = useRouter();
  const { owner, repo, branches, defaultBranch } = useRepo();
  const { config } = useConfig();

  const displayBranches = useMemo(() => {
    let branchesToDisplay: string[] = [];
    if (config) {
      if (branches && branches.length > 0) {
        if (branches.includes(config.branch)) branchesToDisplay.push(config.branch);
        if (defaultBranch && config.branch !== defaultBranch) branchesToDisplay.push(defaultBranch);
        branchesToDisplay = branchesToDisplay.concat(
          branches
            .filter(branch => branch !== config.branch && branch !== defaultBranch)
            .slice(0, 5 - branchesToDisplay.length)
        );
      }
    }
    return branchesToDisplay;
  }, [branches, config, defaultBranch]);

  const branchesCount = useMemo(() => {
    if (branches && branches.length > 5) return `5/${branches.length}`;
    return null;
  }, [branches]);

  const handleBranchChange = (branch: string) => {
    router.push(`/${owner}/${repo}/${encodeURIComponent(branch)}`);
  };

  return (
    <Dialog>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-3">
                  <img className="h-6 w-6 rounded-lg" src={`https://github.com/${owner}.png`} alt="Picture of the author" />
                  {repo}
                  <Badge variant="outline" className="text-xs text-muted-foreground truncate">{config?.branch}</Badge>
                  <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center gap-2" prefetch={true}>
                    <ArrowLeft className="h-3 w-3 min-ml-4 opacity-50" />
                    <span>All projects</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <a href={`https://github.com/${owner}/${repo}`} className="flex items-center gap-2" target="_blank" onClick={onClick} >
                    <span>See on GitHub</span>
                    <ArrowUpRight className="h-3 w-3 ml-auto min-ml-4 opacity-50" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="w-40 text-xs text-muted-foreground font-medium">Branches{branchesCount && ` (${branchesCount})`}</DropdownMenuLabel>
                {displayBranches.length > 0 && (
                  <>
                    <DropdownMenuRadioGroup value={config?.branch} onValueChange={handleBranchChange}>
                      {displayBranches.map((branch: string) => (
                        <DropdownMenuRadioItem key={branch} value={branch} className="max-w-64" onClick={onClick}>
                          <span className="truncate">{branch}</span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DialogTrigger asChild>
                  <DropdownMenuItem onClick={onClick}>Manage branches</DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage branches</DialogTitle>
                </DialogHeader>
                <RepoBranches />
              </DialogContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
    </Dialog>
  );
}